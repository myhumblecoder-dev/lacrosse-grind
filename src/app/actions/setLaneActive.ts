import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/tenancy"
import { playerLevel } from "@/lib/playerLevel"
import { requiredLanes } from "@/lib/laneRequirement"
import { resolveSeasonStart } from "@/lib/seasonAnchor"
import { getTrainingDay } from "@/lib/trainingDay"
import { getWeekStart } from "@/lib/weekUtils"

/**
 * Should switching this lane on push its start to the coming Monday?
 *
 * Only a lane genuinely returning from retirement restarts. Two cases must
 * not: a lane that is already active (the call is a no-op, and re-stamping
 * would bench a running lane), and a lane already trained this week — an
 * off-and-on mis-tap would otherwise hide check-ins the season still counts,
 * leaving the dashboard and the season grid telling different stories.
 */
async function shouldRestart(id: string, userId: string): Promise<boolean> {
  const lane = await prisma.lane.findFirst({
    where: { id, userId },
    select: { isActive: true },
  })
  if (!lane || lane.isActive) return false

  const hitsThisWeek = await prisma.checkIn.count({
    where: { laneId: id, date: { gte: getWeekStart(getTrainingDay(new Date())) } },
  })
  return hitsThisWeek === 0
}

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
    const data: { isActive: boolean; startsOn?: Date } = { isActive }

    if (isActive && (await shouldRestart(id, userId))) {
      // Coming back into play restarts the clock: the lane gets its first
      // whole week rather than the remainder of this one. Retiring leaves the
      // stamp alone — there is nothing to schedule.
      data.startsOn = resolveSeasonStart(getTrainingDay(new Date()))
    }

    const { count } = await prisma.lane.updateMany({
      where: { id, userId },
      data,
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