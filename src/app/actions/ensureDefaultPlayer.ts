'use server'

import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

/**
 * Make sure the account has a player, and that nothing is stranded without one.
 *
 * The backfill used to run only on the branch that CREATES the first player, which
 * left a gap: before prize writes were player-scoped, `upsertPrize`'s create set
 * `userId` alone, so a prize saved at any point AFTER the default player existed
 * got `playerId: null`. Nothing reads those rows — every page and every writer
 * now keys on `playerId` — so the prize was invisible and `upsertPrize` would
 * quietly create a second row beside it. Reclaiming orphans on every call closes
 * that without a one-off script.
 */
export async function ensureDefaultPlayer(): Promise<{ playerId: string }> {
  const userId = await requireUserId()

  const existingPlayer = await prisma.player.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  if (existingPlayer) {
    await adoptOrphans(userId, existingPlayer.id)
    return { playerId: existingPlayer.id }
  }

  const newPlayer = await prisma.player.create({
    data: {
      userId,
      name: 'Player 1',
      isDefault: true,
    },
  })

  await adoptOrphans(userId, newPlayer.id)

  return { playerId: newPlayer.id }
}

/**
 * Bind this account's player-less lanes and prize to `playerId`.
 *
 * Lanes go in one `updateMany` — `Lane.playerId` is not unique, so many rows may
 * share it. The prize cannot: `Prize.playerId` IS unique, so adopting two orphan
 * rows at once would trip that constraint, and since `ensureDefaultPlayer` is
 * awaited from the root layout the throw would blank every page for the account
 * rather than failing one action. So: at most one row, and only when this player
 * does not already have a prize of their own.
 */
async function adoptOrphans(userId: string, playerId: string): Promise<void> {
  await prisma.lane.updateMany({
    where: { userId, playerId: null },
    data: { playerId },
  })

  const alreadyHasPrize = await prisma.prize.findUnique({
    where: { playerId },
    select: { id: true },
  })

  if (alreadyHasPrize) return

  const orphanPrize = await prisma.prize.findFirst({
    where: { userId, playerId: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (!orphanPrize) return

  await prisma.prize.update({
    where: { id: orphanPrize.id },
    data: { playerId },
  })
}