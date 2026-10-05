import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireUserId, requirePlayerId } from "@/lib/tenancy"

export async function deleteLane(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  const userId = await requireUserId()
  const playerId = await requirePlayerId(userId)

  try {
    // Check if a season is currently running FIRST — a running season
    // refuses the delete no matter whose lane the id names.
    //
    // This player's season, not the household's: scoped to the account, one kid
    // with a season running froze lane deletion for their sibling, and a kid
    // with none could delete lanes out from under a sibling mid-season.
    const prize = await prisma.prize.findUnique({
      where: { playerId },
    })

    if (prize?.seasonStart) {
      return { ok: false, error: 'season-running' }
    }

    // Player-scoped existence check: another kid's lane reads as absent.
    const lane = await prisma.lane.findFirst({
      where: { id, playerId },
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