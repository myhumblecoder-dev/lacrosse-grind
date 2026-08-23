import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { rerollBossChallenge } from './rerollBossChallenge'
import { requireUserId } from '@/lib/tenancy'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'
import { playerLevel } from '@/lib/playerLevel'
import { buildChallengePrompt } from '@/lib/bossChallenge'

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
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
  })

  it('a knight gets a second re-roll where a page does not', async () => {
    // Knight (level 5+) gets 2 rerolls. We set defeats to 10 so rank is Knight.
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(10)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerollCount: 1,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃', userId: 'u1' },
    } as any)
    vi.mocked(generate).mockResolvedValue('New Challenge')

    const res = await rerollBossChallenge('b1')

    expect(res.ok).toBe(true)
    expect(prisma.bossBattle.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: expect.objectContaining({ rerollCount: { increment: 1 }, rerolled: true }),
    })
  })

  it('the allowance exhausts to already-rerolled', async () => {
    // Page (level < 5) gets 1 reroll. We set rerollCount to 1.
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerollCount: 1,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃', userId: 'u1' },
    } as any)

    const res = await rerollBossChallenge('b1')

    expect(res).toEqual({ ok: false, error: 'already-rerolled' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('the reroll prompt addresses the rank', async () => {
    // Knight (level 5+) rank name is 'Knight'
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(10)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerollCount: 0,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃', userId: 'u1' },
    } as any)
    vi.mocked(generate).mockResolvedValue('New Challenge')

    await rerollBossChallenge('b1')

    // buildChallengePrompt is real, so we check if it was called with 'Knight'
    // Since we can't spy on the pure function directly without mocking, 
    // we verify the result of the logic via the generate call's arguments.
    expect(generate).toHaveBeenCalledWith(buildChallengePrompt('Running', '🏃', 'knight'))
  })
}) 