import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { startSeason } from './startSeason'
import { resolveSeasonStart } from '@/lib/seasonAnchor'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    checkIn: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    bossBattle: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    weeklyReflection: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    streakFreeze: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    prize: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
  },
}))

describe('startSeason', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set a fixed time: Monday, May 20, 2024
    vi.setSystemTime(new Date(Date.UTC(2024, 4, 20)))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fewer than three lanes throws before touching the prize', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(2)

    await expect(startSeason()).rejects.toThrow('Add at least 3 lanes before starting the season')
    expect(prisma.prize.findUnique).not.toHaveBeenCalled()
  })

  it('a missing prize throws', async () => {
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)

    await expect(startSeason()).rejects.toThrow('Set your prize before starting the season')
    expect(prisma.prize.update).not.toHaveBeenCalled()
  })

  it('three lanes and a prize writes the resolved Monday and returns it', async () => {
    const mockPrize = { id: 'prize', title: 'Test Prize' }
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(mockPrize as any)
    vi.mocked(prisma.prize.update).mockResolvedValue({ ...mockPrize, seasonStart: new Date(0) } as any)

    // resolveSeasonStart(new Date()) for May 20 2024 should return May 20 2024
    // because May 20 2024 is a Monday.
    const result = await startSeason()

    expect(prisma.prize.update).toHaveBeenCalledWith({
      where: { id: 'prize' },
      data: { seasonStart: expect.any(Date) }
    })

    // Verify the returned date is the correct Monday in UTC
    expect(result.seasonStart.getUTCFullYear()).toBe(2024)
    expect(result.seasonStart.getUTCMonth()).toBe(4) // May
    expect(result.seasonStart.getUTCDate()).toBe(20)
  })
})
