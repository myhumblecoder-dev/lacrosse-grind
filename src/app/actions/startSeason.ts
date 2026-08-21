'use server'

import { prisma } from '@/lib/db'
import { resolveSeasonStart } from '@/lib/seasonAnchor'
import { requireUserId } from '@/lib/tenancy'

export async function startSeason(): Promise<{ seasonStart: Date }> {
  const userId = await requireUserId()

  const activeLanesCount = await prisma.lane.count({
    where: { isActive: true, userId },
  })

  if (activeLanesCount < 3) {
    throw new Error('Add at least 3 lanes before starting the season')
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