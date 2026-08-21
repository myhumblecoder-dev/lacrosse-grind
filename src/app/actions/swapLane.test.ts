import { describe, it, expect, vi, beforeEach } from 'vitest'
import { swapLane } from './swapLane'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      count: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

describe('swapLane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.lane.update).mockResolvedValue({} as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as any)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'any' } as any)
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

  it('a foreign outLaneId returns not-found', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(4)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)

    const result = await swapLane({ outLaneId: 'foreign-id' })

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.lane.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-id', userId: 'u1' },
    })
  })

  it('a foreign inLaneId returns not-found', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(4)
    // outLane is found, but inLane is not
    vi.mocked(prisma.lane.findFirst)
      .mockResolvedValueOnce({ id: 'valid-out' } as any)
      .mockResolvedValueOnce(null)

    const result = await swapLane({ outLaneId: 'valid-out', inLaneId: 'foreign-in' })

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.lane.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-in', userId: 'u1' },
    })
  })

  it('the lane count is scoped to the owner', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(4)

    await swapLane({ outLaneId: 'lane-2' })

    expect(prisma.lane.count).toHaveBeenCalledWith({
      where: { isActive: true, userId: 'u1' },
    })
  })
})
