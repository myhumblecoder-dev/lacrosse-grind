import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";

export async function useFreeze(
  laneId: string,
  date: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const freeze = await prisma.streakFreeze.findFirst({
    where: { laneId, usedDate: null, lane: { userId } },
  });

  if (!freeze) {
    return { ok: false, error: "no-freeze-available" };
  }

  await prisma.streakFreeze.update({
    where: { id: freeze.id },
    data: { usedDate: date },
  });

  revalidatePath("/");
  return { ok: true };
}