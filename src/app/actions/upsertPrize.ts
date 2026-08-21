import { prisma as db } from "@/lib/db";
import { prizeSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";

export async function upsertPrize(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = prizeSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const data = parsed.data;
  const inputAsObj = input as Record<string, unknown>;

  // To ensure photoUrl is left untouched when the field is absent from the input,
  // we check if 'photoUrl' exists in the raw input object.
  let photoUrl: string | null | undefined = data.photoUrl;

  if (!("photoUrl" in inputAsObj)) {
    const existing = await db.prize.findUnique({
      where: { userId },
      select: { photoUrl: true },
    });
    photoUrl = existing?.photoUrl ?? null;
  }

  const updateData = {
    ...data,
    photoUrl: photoUrl ?? null,
  };

  const prize = await db.prize.upsert({
    where: { userId },
    update: updateData,
    create: {
      ...updateData,
      userId,
    },
  });

  revalidatePath("/prize");

  return { ok: true, id: prize.id };
}
