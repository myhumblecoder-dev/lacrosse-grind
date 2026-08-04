import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function deleteLane(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  try {
    // Cascade the lane's dependent rows in a single transaction (the schema has
    // no ON DELETE CASCADE, so the FK'd check-ins/battles must go first).
    await prisma.$transaction([
      prisma.checkIn.deleteMany({ where: { laneId: id } }),
      prisma.bossBattle.deleteMany({ where: { laneId: id } }),
      prisma.streakFreeze.deleteMany({ where: { laneId: id } }),
      prisma.lane.delete({ where: { id } }),
    ])
  } catch {
    return { ok: false, error: "not-found" }
  }

  revalidatePath("/lanes")
  revalidatePath("/")
  return { ok: true }
}
