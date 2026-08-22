import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { rerollBossChallenge } from './rerollBossChallenge'
import { requireUserId } from '@/lib/tenancy'
import { generate } from '@/lib/llm' // Note: path depends on actual structure, using relative to scaffold logic
import { revalidatePath } from 'next/cache'

// We need to mock the imports that are not pure or involve I/O
vi.mock('@/lib/db', () => ({
  prisma: {
    lane: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    checkIn: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    bossBattle: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    streakFreeze: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    prize: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    user: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    account: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    session: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    verificationToken: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
  },
}))

vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('rerollBossChallenge', () => {
  const userId = 'u1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(userId)
  })

  it('a second reroll returns already-rerolled without generating', async () => {
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerolled: true,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃' },
    } as any)

    const res = await rerollBossChallenge('b1')

    expect(res).toEqual({ ok: false, error: 'already-rerolled' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('a defeated boss cannot be rerolled', async () => {
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerolled: false,
      completedAt: new Date(Date.UTC(2023, 1, 1)),
      lane: { name: 'Running', emoji: '🏃' },
    } as any)

    const res = await rerollBossChallenge('b1')

    expect(res).toEqual({ ok: false, error: 'already-defeated' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('a reroll stores the new challenge and marks rerolled', async () => {
    const newChallenge = 'Run 5km in under 30 mins'
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerolled: false,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃' },
    } as any)
    vi.mocked(generate).mockResolvedValue(newChallenge)
    vi.mocked(prisma.bossBattle.update).mockResolvedValue({} as any)

    const res = await rerollBossChallenge('b1')

    expect(res).toEqual({ ok: true, challenge: newChallenge })
    expect(prisma.bossBattle.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { challenge: newChallenge, rerolled: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/boss-battles')
  })
})