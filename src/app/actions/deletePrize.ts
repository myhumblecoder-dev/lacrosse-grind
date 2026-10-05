import { prisma as db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";

export async function deletePrize(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);
  try {
    // This player's prize only. Scoped to the account it deleted every kid's.
    const { count } = await db.prize.deleteMany({
      where: { playerId },
    });

    if (count === 0) {
      return { ok: false, error: 'not-found' };
    }

    revalidatePath("/prize");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}