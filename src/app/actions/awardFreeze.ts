import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function awardFreeze(
  laneId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!laneId || !laneId.trim()) {
    return { ok: false, error: "missing-laneId" };
  }

  const freeze = await prisma.streakFreeze.create({ data: { laneId } });

  revalidatePath("/");
  return { ok: true, id: freeze.id };
}
