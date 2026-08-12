'use server'

import { prisma } from '@/lib/db'
import { resolveSeasonStart } from '@/lib/seasonAnchor'

export async function startSeason(): Promise<{ seasonStart: Date }> {
  const activeLanesCount = await prisma.lane.count({
    where: { isActive: true },
  })

  if (activeLanesCount < 3) {
    throw new Error('Add at least 3 lanes before starting the season')
  }

  const prize = await prisma.prize.findUnique({
    where: { id: 'prize' },
  })

  if (!prize) {
    throw new Error('Set your prize before starting the season')
  }

  const seasonStart = resolveSeasonStart(new Date())

  await prisma.prize.update({
    where: { id: 'prize' },
    data: {
      seasonStart,
    },
  })

  return { seasonStart }
}