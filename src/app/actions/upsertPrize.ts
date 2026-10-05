import { prisma as db } from "@/lib/db";
import { prizeSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";

/**
 * Save the thing this player is training for.
 *
 * Keyed on the PLAYER, not the account. Keyed on `userId` it could only ever
 * maintain one row per account: a second kid's prize found the first kid's row
 * and overwrote it, and because the create never set `playerId`, the prize page —
 * which reads by `playerId` — then found nothing for either of them.
 */
export async function upsertPrize(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);
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
      where: { playerId },
      select: { photoUrl: true },
    });
    photoUrl = existing?.photoUrl ?? null;
  }

  const updateData = {
    ...data,
    photoUrl: photoUrl ?? null,
  };

  const prize = await db.prize.upsert({
    where: { playerId },
    update: updateData,
    create: {
      ...updateData,
      userId,
      playerId,
    },
  });

  revalidatePath("/prize");

  return { ok: true, id: prize.id };
}
