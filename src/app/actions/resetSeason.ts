'use server'

import { prisma } from '@/lib/db'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'

export async function resetSeason(): Promise<void> {
  const userId = await requireUserId()
  const playerId = await requirePlayerId(userId)

  // This player's season, not the household's. Scoped to the account it cleared
  // every kid's seasonStart at once.
  await prisma.prize.updateMany({
    where: { playerId },
    data: { seasonStart: null },
  })
}