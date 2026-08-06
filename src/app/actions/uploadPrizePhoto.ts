import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma as db } from "@/lib/db";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** What we're about to upload, once a File or a remote URL has been resolved. */
type Payload = { body: File | Blob; name: string };

/**
 * Download a pasted image link so it can be re-uploaded to our own store.
 *
 * We deliberately do NOT keep the remote URL: `next/image` only renders hosts
 * listed in `remotePatterns`, widening that to `**` would turn the app into an
 * open image proxy, and a hotlinked image vanishes when its host deletes it.
 */
async function fetchRemoteImage(
  url: string
): Promise<{ ok: true; payload: Payload } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { ok: false, error: "fetch-failed" };
  }

  if (!response.ok) {
    return { ok: false, error: "fetch-failed" };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, error: "not-an-image" };
  }

  // Size is measured from the downloaded bytes, not content-length: that
  // header is optional and a remote host can lie about it.
  const body = await response.blob();
  if (body.size > MAX_FILE_SIZE) {
    return { ok: false, error: "too-large" };
  }

  const lastSegment = new URL(url).pathname.split("/").filter(Boolean).pop();
  return { ok: true, payload: { body, name: lastSegment || "photo" } };
}

export async function uploadPrizePhoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
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
    payload = { body: file, name: file.name };
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
    // 1. Upload the new image — same path whether it came from disk or a link
    const pathname = `prize/${Date.now()}-${payload.name}`;
    const blob = await put(pathname, payload.body, { access: "public" });
    const newUrl = blob.url;

    // 2. Update the database
    const prize = await db.prize.findUnique({
      where: { id: "prize" },
    });

    await db.prize.update({
      where: { id: "prize" },
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