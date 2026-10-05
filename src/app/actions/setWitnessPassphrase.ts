import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { witnessPassphraseSchema } from "@/lib/validation";
import { hashWitnessPassphrase } from "@/lib/witnessPassphrase";

/**
 * Set or replace the witness passphrase that unlocks `/amend`.
 *
 * No old passphrase is asked for, and that is a deliberate limit on what this
 * protects — not a claim that it protects more.
 *
 * It is NOT a boundary against whoever holds the unlocked device. They have the
 * signed-in session, so they can replace the passphrase here and then attest
 * whatever they like. Requiring the current one would close that, at the cost of
 * a hard lockout the moment a parent forgets it, with no recovery short of
 * deleting the account.
 *
 * What it does buy is worth having: amending becomes a deliberate act rather
 * than a tap, and `attestedAt` makes every amendment attributable afterwards —
 * History rings an attested day, so a parent sees any they did not make. The
 * posture is detection, not prevention. Prevention would need a real second
 * factor (an emailed reset, or re-authenticating with Google immediately before
 * the change), which is its own piece of work.
 */
export async function setWitnessPassphrase(
  passphrase: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const parsed = witnessPassphraseSchema.safeParse(passphrase);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { witnessHash: hashWitnessPassphrase(parsed.data) },
  });

  revalidatePath("/account");
  return { ok: true };
}
