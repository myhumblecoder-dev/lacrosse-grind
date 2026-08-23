'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { swapSchema } from '@/lib/validation'
import { validateSwap } from '@/lib/validateSwap'
import { requireUserId } from '@/lib/tenancy'
import { playerLevel } from '@/lib/playerLevel'
import { requiredLanes } from '@/lib/laneRequirement'

type SwapResult = { ok: true } | { ok: false; error: string }

/**
 * Retire a lane, or trade it for another.
 *
 * The season needs three active lanes at all times, so the rule is one
 * invariant with two shapes: above the floor Eddie may simply retire; at the
 * floor the only legal move is a straight swap, which runs as one transaction
 * so he is never briefly left with two lanes.
 *
 * The retired lane's check-ins and boss battles are deliberately kept. They
 * are what the season grid reads to decide which weeks he already earned —
 * deleting them would let a swap quietly undo his season.
 */
export async function swapLane(input: unknown): Promise<SwapResult> {
  const userId = await requireUserId()

  const parsed = swapSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const { outLaneId, inLaneId } = parsed.data

  const activeLaneCount = await prisma.lane.count({
    where: { isActive: true, userId }
  })

  const defeats = await prisma.bossBattle.count({
    where: { completedAt: { not: null }, lane: { userId } }
  })

  const floor = requiredLanes(playerLevel(defeats).level)
  const decision = validateSwap(activeLaneCount, floor)

  if (decision.blocked) return { ok: false, error: 'blocked' }
  if (decision.mustPickReplacement && !inLaneId) {
    return { ok: false, error: 'replacement-required' }
  }

  // Verify ownership of outLaneId
  const outLane = await prisma.lane.findFirst({
    where: { id: outLaneId, userId }
  })
  if (!outLane) return { ok: false, error: 'not-found' }

  // Verify ownership of inLaneId if present
  if (inLaneId) {
    const inLane = await prisma.lane.findFirst({
      where: { id: inLaneId, userId }
    })
    if (!inLane) return { ok: false, error: 'not-found' }
  }

  if (inLaneId) {
    await prisma.$transaction([
      prisma.lane.update({ where: { id: outLaneId }, data: { isActive: false } }),
      prisma.lane.update({ where: { id: inLaneId }, data: { isActive: true } }),
    ])
  } else {
    await prisma.lane.update({
      where: { id: outLaneId },
      data: { isActive: false },
    })
  }

  revalidatePath('/lanes')
  revalidatePath('/')
  return { ok: true }
}