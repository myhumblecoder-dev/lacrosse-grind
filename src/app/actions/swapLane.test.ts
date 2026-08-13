import { describe, it, expect, vi, beforeEach } from 'vitest'
import { swapLane } from './swapLane'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: { count: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { prisma } from '@/lib/db'

describe('swapLane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.lane.update).mockResolvedValue({} as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)
  })

  it('rejects input that is not a valid swap', async () => {
    const result = await swapLane({ outLaneId: '' })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.lane.count).not.toHaveBeenCalled()
  })

  it('refuses any change that would leave fewer than three lanes', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(2)

    const result = await swapLane({ outLaneId: 'lane-2' })

    expect(result).toEqual({ ok: false, error: 'blocked' })
    expect(prisma.lane.update).not.toHaveBeenCalled()
  })

  it('retires a lane outright when more than three are active', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(4)

    const result = await swapLane({ outLaneId: 'lane-2' })

    expect(result).toEqual({ ok: true })
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-2' },
      data: { isActive: false },
    })
  })

  it('demands a replacement at exactly three lanes', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(3)

    const result = await swapLane({ outLaneId: 'lane-2' })

    expect(result).toEqual({ ok: false, error: 'replacement-required' })
    expect(prisma.lane.update).not.toHaveBeenCalled()
  })

  it('swaps one lane for another in a single transaction', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(3)

    const result = await swapLane({ outLaneId: 'lane-2', inLaneId: 'lane-9' })

    expect(result).toEqual({ ok: true })
    // One transaction, so Eddie is never briefly left with two lanes.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-2' },
      data: { isActive: false },
    })
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-9' },
      data: { isActive: true },
    })
  })
})
