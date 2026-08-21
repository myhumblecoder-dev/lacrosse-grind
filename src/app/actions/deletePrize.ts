import { prisma as db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";

export async function deletePrize(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  try {
    const { count } = await db.prize.deleteMany({
      where: { userId },
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