import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/tenancy"

export async function deleteLane(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  const userId = await requireUserId()

  try {
    // Check if a season is currently running FIRST — a running season
    // refuses the delete no matter whose lane the id names.
    const prize = await prisma.prize.findUnique({
      where: { userId },
    })

    if (prize?.seasonStart) {
      return { ok: false, error: 'season-running' }
    }

    // Owner-scoped existence check: a foreign lane reads as absent.
    const lane = await prisma.lane.findFirst({
      where: { id, userId },
    })

    if (!lane) {
      return { ok: false, error: 'not-found' }
    }

    // Cascade the lane's dependent rows in a single transaction (the schema has
    // no ON DELETE CASCADE, so the FK'd check-ins/battles must go first).
    await prisma.$transaction([
      prisma.checkIn.deleteMany({ where: { laneId: id } }),
      prisma.bossBattle.deleteMany({ where: { laneId: id } }),
      prisma.streakFreeze.deleteMany({ where: { laneId: id } }),
      prisma.lane.delete({ where: { id } }),
    ])
  } catch (err) {
    return { ok: false, error: "not-found" }
  }

  revalidatePath("/lanes")
  revalidatePath("/")
  return { ok: true }
}