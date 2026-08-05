import { prisma as db } from "@/lib/db";
import { prizeSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function upsertPrize(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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
      where: { id: "prize" },
      select: { photoUrl: true },
    });
    photoUrl = existing?.photoUrl ?? null;
  }

  const updateData = {
    ...data,
    photoUrl: photoUrl ?? null,
  };

  await db.prize.upsert({
    where: { id: "prize" },
    update: updateData,
    create: {
      id: "prize",
      ...updateData,
    },
  });

  revalidatePath("/prize");

  return { ok: true, id: "prize" };
}