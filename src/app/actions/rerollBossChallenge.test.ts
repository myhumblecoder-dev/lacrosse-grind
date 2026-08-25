import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { rerollBossChallenge } from './rerollBossChallenge'
import { requireUserId } from '@/lib/tenancy'
import { askCoach } from '@/lib/coach'
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
vi.mock('@/lib/coach', () => ({ askCoach: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('rerollBossChallenge', () => {
  const userId = 'u1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(userId)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
  })

  it('a barbarian gets a second re-roll where a hatchling does not', async () => {
    // Level 5+ gets 2 rerolls. We set defeats to 10, so the rank is barbarian.
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(10)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerollCount: 1,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃', userId: 'u1' },
    } as any)
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'New Challenge' })

    const res = await rerollBossChallenge('b1')

    expect(res.ok).toBe(true)
    expect(prisma.bossBattle.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: expect.objectContaining({ rerollCount: { increment: 1 }, rerolled: true }),
    })
  })

  it('the allowance exhausts to already-rerolled', async () => {
    // Below level 5 gets 1 reroll (0 defeats is hatchling). rerollCount is 1.
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerollCount: 1,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃', userId: 'u1' },
    } as any)

    const res = await rerollBossChallenge('b1')

    expect(res).toEqual({ ok: false, error: 'already-rerolled' })
    expect(askCoach).not.toHaveBeenCalled()
  })

  it('the reroll prompt addresses the rank', async () => {
    // 10 defeats is level 5, whose rank name is 'barbarian'
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(10)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1',
      rerollCount: 0,
      completedAt: null,
      lane: { name: 'Running', emoji: '🏃', userId: 'u1' },
    } as any)
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'New Challenge' })

    await rerollBossChallenge('b1')

    // buildChallengePrompt is real, so we check it was called with 'barbarian'
    // Since we can't spy on the pure function directly without mocking, 
    // we verify the result of the logic via the generate call's arguments.
    expect(askCoach).toHaveBeenCalledWith(expect.any(String), expect.any(String), buildChallengePrompt('Running', '🏃', 'barbarian'))
  })
}) 
describe('rerollBossChallenge — the path that had no cap at all', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuses when the budget is spent, and writes nothing', async () => {
    // This action called generate() directly with no limit of any kind while
    // sign-ups were open and the API key was live.
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1', rerollCount: 0, completedAt: null,
      lane: { name: 'Wall ball', emoji: '🥍' },
    } as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(askCoach).mockResolvedValue({ ok: false, error: 'coach-limit' })

    const result = await rerollBossChallenge('b1')

    expect(result).toEqual({ ok: false, error: 'coach-limit' })
    expect(prisma.bossBattle.update).not.toHaveBeenCalled()
  })

  it('asks as the reroll kind, so the spend is attributable', async () => {
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: 'b1', rerollCount: 0, completedAt: null,
      lane: { name: 'Wall ball', emoji: '🥍' },
    } as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'New Challenge' })

    await rerollBossChallenge('b1')

    expect(askCoach).toHaveBeenCalledWith('u1', 'reroll', expect.any(String))
  })
})
