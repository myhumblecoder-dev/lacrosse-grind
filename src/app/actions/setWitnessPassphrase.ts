import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { witnessPassphraseSchema } from "@/lib/validation";
import { hashWitnessPassphrase } from "@/lib/witnessPassphrase";

/**
 * Set or replace the witness passphrase that unlocks `/amend`.
 *
 * No old passphrase is asked for, by design. This guards against a kid holding
 * an unlocked device, not against someone who already has the Google account —
 * and whoever is signed in IS the account owner. A recovery flow on top of a
 * secret the session can already replace would be theatre, and theatre that
 * locks a parent out on the night they need it.
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
