import { describe, it, expect, vi, beforeEach } from 'vitest'
import { swapLane } from './swapLane'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      count: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    bossBattle: {
      count: vi.fn(),
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
    vi.mocked(prisma.lane.count).mockResolvedValue(4)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
  })

  it('rejects input that is not a valid swap', async () => {
    const result = await swapLane({ outLaneId: '' })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.lane.count).not.toHaveBeenCalled()
  })

  it('refuses any change that would leave fewer than three lanes', async () => {
    // We need to force the decision to be blocked.
    // Since we aren't mocking validateSwap, we rely on the real logic.
    // If we set count to 2, validateSwap(2, floor) will return blocked.
    // We'll use a low number of defeats to ensure floor is high.
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(prisma.lane.count).mockResolvedValue(2)

    const result = await swapLane({ outLaneId: 'lane-2' })

    expect(result).toEqual({ ok: false, error: 'blocked' })
    expect(prisma.lane.update).not.toHaveBeenCalled()
  })

  it('retires a lane outright when more than three are active', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(4)
    // zero defeats -> hatchling -> floor 3; four active lanes sit above it

    const result = await swapLane({ outLaneId: 'lane-2' })

    expect(result).toEqual({ ok: true })
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-2' },
      data: { isActive: false },
    })
  })

  it('demands a replacement at exactly three lanes', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    // zero defeats -> hatchling -> floor 3; exactly at the floor demands a swap

    const result = await swapLane({ outLaneId: 'lane-2' })

    expect(result).toEqual({ ok: false, error: 'replacement-required' })
    expect(prisma.lane.update).not.toHaveBeenCalled()
  })

  it('swaps one lane for another in a single transaction', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    // zero defeats -> floor 3; at the floor a paired swap is the legal move

    const result = await swapLane({ outLaneId: 'lane-2', inLaneId: 'lane-9' })

    expect(result).toEqual({ ok: true })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-2' },
      data: { isActive: false },
    })
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-9' },
      data: { isActive: true, startsOn: expect.any(Date) },
    })
  })

  it('the lane swapped in starts on the coming Monday, not mid-week', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T18:00:00.000Z')) // Sunday
    vi.mocked(prisma.lane.count).mockResolvedValue(3)

    await swapLane({ outLaneId: 'lane-2', inLaneId: 'lane-9' })

    const inCall = vi
      .mocked(prisma.lane.update)
      .mock.calls.find((c) => c[0].where.id === 'lane-9')!
    const data = inCall[0].data as { startsOn: Date }
    expect(data.startsOn.toISOString()).toBe('2026-08-24T00:00:00.000Z')
    vi.useRealTimers()
  })

  it('retiring a lane leaves its start stamp alone', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(4)

    await swapLane({ outLaneId: 'lane-2' })

    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-2' },
      data: { isActive: false },
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

  it('a legend-level roster at 6 lanes must swap, not retire', async () => {
    // 50 defeats is past the top threshold (34), so the rank is legend —
    // level 8, and `requiredLanes` caps at 6 from level 5 up, so the floor is
    // SIX, not three. Being at the floor is exactly why this is a swap: a bare
    // retire would drop below it, and naming an `inLaneId` keeps the count.
    vi.mocked(prisma.lane.count).mockResolvedValue(6)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(50)

    const result = await swapLane({ outLaneId: 'lane-6', inLaneId: 'lane-7' })

    expect(result).toEqual({ ok: true })
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("a hatchling-level roster keeps today's behavior", async () => {
    // Hatchling level (0 defeats) -> floor 3, exactly today's rule: at three
    // lanes a bare retire demands a replacement, same as before this story.
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)

    const result = await swapLane({ outLaneId: 'lane-3' })

    expect(result).toEqual({ ok: false, error: 'replacement-required' })
  })
})
