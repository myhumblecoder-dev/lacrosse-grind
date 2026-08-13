'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { swapSchema } from '@/lib/validation'
import { validateSwap } from '@/lib/validateSwap'

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
  const parsed = swapSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const { outLaneId, inLaneId } = parsed.data

  const activeLaneCount = await prisma.lane.count({ where: { isActive: true } })
  const decision = validateSwap(activeLaneCount)

  if (decision.blocked) return { ok: false, error: 'blocked' }
  if (decision.mustPickReplacement && !inLaneId) {
    return { ok: false, error: 'replacement-required' }
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
