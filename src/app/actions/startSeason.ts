'use server'

import { prisma } from '@/lib/db'
import { resolveSeasonStart } from '@/lib/seasonAnchor'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'
import { playerLevel } from '@/lib/playerLevel'
import { requiredLanes } from '@/lib/laneRequirement'

export async function startSeason(): Promise<{ seasonStart: Date }> {
  const userId = await requireUserId()
  const playerId = await requirePlayerId(userId)

  // Every count here is this player's. Scoped to the account, a second kid
  // inherited the first kid's defeats — so their rank, and the number of lanes
  // demanded before a season could start, were somebody else's.
  const defeats = await prisma.bossBattle.count({
    where: { completedAt: { not: null }, lane: { playerId } },
  })

  const rank = playerLevel(defeats)
  const required = requiredLanes(rank.level)

  const activeLanesCount = await prisma.lane.count({
    where: { isActive: true, playerId },
  })

  if (activeLanesCount < required) {
    throw new Error('Your ' + rank.name + ' demands ' + required + ' active lanes before the season starts')
  }

  const prize = await prisma.prize.findUnique({
    where: { playerId },
  })

  if (!prize) {
    throw new Error('Set your prize before starting the season')
  }

  const seasonStart = resolveSeasonStart(new Date())

  await prisma.prize.update({
    where: { playerId },
    data: {
      seasonStart,
    },
  })

  return { seasonStart }
}