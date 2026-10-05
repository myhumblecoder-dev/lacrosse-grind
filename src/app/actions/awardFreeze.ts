import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";

export async function awardFreeze(
  laneId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);

  if (!laneId || !laneId.trim()) {
    return { ok: false, error: "missing-laneId" };
  }

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, playerId }
  });

  if (!lane) {
    return { ok: false, error: "not-found" };
  }

  const freeze = await prisma.streakFreeze.create({ data: { laneId } });

  revalidatePath("/");
  return { ok: true, id: freeze.id };
}