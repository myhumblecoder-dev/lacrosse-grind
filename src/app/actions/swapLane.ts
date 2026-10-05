'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { swapSchema } from '@/lib/validation'
import { validateSwap } from '@/lib/validateSwap'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'
import { playerLevel } from '@/lib/playerLevel'
import { requiredLanes } from '@/lib/laneRequirement'
import { resolveSeasonStart } from '@/lib/seasonAnchor'
import { getTrainingDay } from '@/lib/trainingDay'

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
  const playerId = await requirePlayerId(userId)

  const parsed = swapSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const { outLaneId, inLaneId } = parsed.data

  // Both counts are THIS player's. Scoped to the account, a second kid's lanes
  // inflated the active count that decides whether a swap is allowed, and their
  // defeats inflated the rank that sets the floor — so one kid's progress
  // silently moved the other kid's goalposts.
  const activeLaneCount = await prisma.lane.count({
    where: { isActive: true, playerId }
  })

  const defeats = await prisma.bossBattle.count({
    where: { completedAt: { not: null }, lane: { playerId } }
  })

  const floor = requiredLanes(playerLevel(defeats).level)
  const decision = validateSwap(activeLaneCount, floor)

  if (decision.blocked) return { ok: false, error: 'blocked' }
  if (decision.mustPickReplacement && !inLaneId) {
    return { ok: false, error: 'replacement-required' }
  }

  // Verify the lane is this player's, not merely this account's.
  const outLane = await prisma.lane.findFirst({
    where: { id: outLaneId, playerId }
  })
  if (!outLane) return { ok: false, error: 'not-found' }

  // Verify ownership of inLaneId if present
  if (inLaneId) {
    const inLane = await prisma.lane.findFirst({
      where: { id: inLaneId, playerId }
    })
    if (!inLane) return { ok: false, error: 'not-found' }
  }

  if (inLaneId) {
    // The lane coming in starts on the Monday on or after today. Swapping on a
    // Friday must not hand it a two-day week it cannot win.
    const startsOn = resolveSeasonStart(getTrainingDay(new Date()))
    await prisma.$transaction([
      prisma.lane.update({ where: { id: outLaneId }, data: { isActive: false } }),
      prisma.lane.update({
        where: { id: inLaneId },
        data: { isActive: true, startsOn },
      }),
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