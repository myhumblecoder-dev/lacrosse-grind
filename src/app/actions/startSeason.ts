'use server'

import { prisma } from '@/lib/db'
import { resolveSeasonStart } from '@/lib/seasonAnchor'
import { requireUserId } from '@/lib/tenancy'
import { playerLevel } from '@/lib/playerLevel'
import { requiredLanes } from '@/lib/laneRequirement'

export async function startSeason(): Promise<{ seasonStart: Date }> {
  const userId = await requireUserId()

  const defeats = await prisma.bossBattle.count({
    where: { completedAt: { not: null }, lane: { userId } },
  })

  const rank = playerLevel(defeats)
  const required = requiredLanes(rank.level)

  const activeLanesCount = await prisma.lane.count({
    where: { isActive: true, userId },
  })

  if (activeLanesCount < required) {
    throw new Error('Your ' + rank.name + ' demands ' + required + ' active lanes before the season starts')
  }

  const prize = await prisma.prize.findUnique({
    where: { userId },
  })

  if (!prize) {
    throw new Error('Set your prize before starting the season')
  }

  const seasonStart = resolveSeasonStart(new Date())

  await prisma.prize.update({
    where: { userId },
    data: {
      seasonStart,
    },
  })

  return { seasonStart }
}