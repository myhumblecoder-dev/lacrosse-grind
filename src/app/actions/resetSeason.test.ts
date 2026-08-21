import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'
import { resetSeason } from './resetSeason'

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

vi.mock('@/lib/tenancy', () => ({
  requireUserId: vi.fn()
}))

describe('resetSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('the reset is scoped to the owner', async () => {
    vi.mocked(prisma.prize.updateMany).mockResolvedValue({ count: 1 })

    await resetSeason()

    expect(requireUserId).toHaveBeenCalled()
    expect(prisma.prize.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { seasonStart: null }
    })
  })

  it('it clears seasonStart on the prize row', async () => {
    vi.mocked(prisma.prize.updateMany).mockResolvedValue({ count: 1 })

    await resetSeason()

    expect(prisma.prize.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { seasonStart: null }
    })
  })

  it('a missing prize row surfaces the Prisma error unchanged', async () => {
    const error = new Error('Record to update not found.')
    vi.mocked(prisma.prize.updateMany).mockRejectedValue(error)

    await expect(resetSeason()).rejects.toThrow('Record to update not found.')
  })
})
