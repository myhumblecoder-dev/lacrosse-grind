import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma as db } from "@/lib/db";
import { requireUserId } from "@/lib/tenancy";
import { assertFetchableUrl } from "@/lib/fetchableUrl";
import { resolveHost } from "@/lib/resolveHost";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

/** What we're about to upload, once a File or a remote URL has been resolved. */
type Payload = { body: File | Blob; name: string };

/**
 * Reduce an untrusted filename to something safe to append to a blob path.
 *
 * Uploads are stored at `${userId}/${name}`, so the user id is the only thing
 * separating one family's photos from another's. Both sources of that name are
 * attacker-controlled — the last path segment of a pasted URL, and the
 * filename in a multipart upload — and a name of `..` would climb straight out
 * of that namespace.
 */
function safeBlobName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]/g, "-") // allowlist; everything else is a dash
    .replace(/^\.+/, ""); // no leading dots: kills ".." and dotfiles
  return cleaned.slice(0, 100) || "photo";
}

/**
 * Read a response body, giving up as soon as it exceeds `max`.
 *
 * Size is checked while reading rather than after, because `.blob()` buffers
 * the whole body first: a link to a multi-gigabyte endpoint would drive the
 * server's memory up before anyone got to measure it. `content-length` is
 * consulted as a shortcut but never trusted — it is optional, and a hostile
 * host will simply lie.
 */
async function readCapped(response: Response, max: number): Promise<Blob | null> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;

  const stream = response.body;
  if (!stream) {
    const blob = await response.blob();
    return blob.size > max ? null : blob;
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return new Blob(chunks as BlobPart[]);
}

/**
 * Download a pasted image link so it can be re-uploaded to our own store.
 *
 * We deliberately do NOT keep the remote URL: `next/image` only renders hosts
 * listed in `remotePatterns`, widening that to `**` would turn the app into an
 * open image proxy, and a hotlinked image vanishes when its host deletes it.
 *
 * Redirects are followed by hand rather than by `fetch`, because the automatic
 * ones are the hole: a perfectly ordinary https link is allowed to answer with
 * a 302 to the metadata endpoint, and checking only the URL that was pasted
 * would wave it straight through.
 */
async function fetchRemoteImage(
  url: string
): Promise<{ ok: true; payload: Payload } | { ok: false; error: string }> {
  let target = url;
  let response: Response;

  for (let hop = 0; ; hop++) {
    const allowed = await assertFetchableUrl(target, resolveHost);
    if (!allowed.ok) return { ok: false, error: allowed.error };

    try {
      response = await fetch(allowed.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: "image/*" },
      });
    } catch {
      return { ok: false, error: "fetch-failed" };
    }

    // Positive test, so anything that is not clearly a redirect — including a
    // response with no status at all — falls through to the content checks
    // rather than being chased as one.
    if (!(response.status >= 300 && response.status < 400)) break;

    if (hop >= MAX_REDIRECTS) return { ok: false, error: "fetch-failed" };
    const location = response.headers.get("location");
    if (!location) return { ok: false, error: "fetch-failed" };
    // Resolved against the current URL so a relative Location still works.
    target = new URL(location, allowed.url).toString();
  }

  if (!response.ok) {
    return { ok: false, error: "fetch-failed" };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, error: "not-an-image" };
  }

  const body = await readCapped(response, MAX_FILE_SIZE);
  if (body === null) {
    return { ok: false, error: "too-large" };
  }

  const lastSegment = new URL(url).pathname.split("/").filter(Boolean).pop();
  return { ok: true, payload: { body, name: safeBlobName(lastSegment ?? "") } };
}

export async function uploadPrizePhoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const file = formData.get("photo");
  const remoteUrl = formData.get("photoUrl");

  let payload: Payload;

  if (file instanceof File) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "not-an-image" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: "too-large" };
    }
    payload = { body: file, name: safeBlobName(file.name) };
  } else if (typeof remoteUrl === "string" && remoteUrl.trim().length > 0) {
    const fetched = await fetchRemoteImage(remoteUrl.trim());
    if (!fetched.ok) {
      return { ok: false, error: fetched.error };
    }
    payload = fetched.payload;
  } else {
    return { ok: false, error: "no-file" };
  }

  try {
    // 1. Upload the new image — same path whether it came or a link
    const pathname = `${userId}/${payload.name}`;
    const blob = await put(pathname, payload.body, { access: "public" });
    const newUrl = blob.url;

    // 2. Update the database
    const prize = await db.prize.findUnique({
      where: { userId },
    });

    await db.prize.update({
      where: { userId },
      data: { photoUrl: newUrl },
    });

    // 3. Cleanup old blob if it exists
    if (prize?.photoUrl && prize.photoUrl !== newUrl) {
      try {
        await del(prize.photoUrl);
      } catch (err) {
        // Swallow deletion errors so the upload/update isn't rolled back
        console.error("Failed to delete old blob:", err instanceof Error ? err.message : err);
      }
    }

    revalidatePath("/prize");

    return { ok: true, url: newUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}