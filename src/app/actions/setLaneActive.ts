import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/tenancy"
import { playerLevel } from "@/lib/playerLevel"
import { requiredLanes } from "@/lib/laneRequirement"

export async function setLaneActive(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId()
  if (!id) return { ok: false, error: "missing-id" }

  if (!isActive) {
    const activeCount = await prisma.lane.count({
      where: { isActive: true, userId },
    })
    const defeats = await prisma.bossBattle.count({
      where: {
        completedAt: { not: null },
        lane: { userId },
      },
    })

    const level = playerLevel(defeats).level
    const required = requiredLanes(level)

    if (activeCount - 1 < required) {
      return { ok: false, error: "blocked" }
    }
  }

  try {
    const { count } = await prisma.lane.updateMany({
      where: { id, userId },
      data: { isActive },
    })

    if (count !== 1) {
      return { ok: false, error: "not-found" }
    }
  } catch (err) {
    return { ok: false, error: "not-found" }
  }

  revalidatePath("/lanes")
  revalidatePath("/")
  return { ok: true }
}