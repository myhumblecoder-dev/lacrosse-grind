import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma as db } from "@/lib/db";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadPrizePhoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("photo");

  if (!file || !(file instanceof File)) {
    return { ok: false, error: "no-file" };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "not-an-image" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "too-large" };
  }

  try {
    // 1. Upload the new file
    const pathname = `prize/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, { access: "public" });
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