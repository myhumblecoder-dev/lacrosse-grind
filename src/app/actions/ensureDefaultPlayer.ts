'use server'

import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

export async function ensureDefaultPlayer(): Promise<{ playerId: string }> {
  const userId = await requireUserId()

  const existingPlayer = await prisma.player.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  if (existingPlayer) {
    return { playerId: existingPlayer.id }
  }

  const newPlayer = await prisma.player.create({
    data: {
      userId,
      name: 'Player 1',
      isDefault: true,
    },
  })

  await prisma.lane.updateMany({
    where: { userId, playerId: null },
    data: { playerId: newPlayer.id },
  })

  await prisma.prize.updateMany({
    where: { userId, playerId: null },
    data: { playerId: newPlayer.id },
  })

  return { playerId: newPlayer.id }
}