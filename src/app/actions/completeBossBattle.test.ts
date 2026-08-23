import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { completeBossBattle } from '@/app/actions/completeBossBattle'
import { requireUserId } from '@/lib/tenancy'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'
import { playerLevel } from '@/lib/playerLevel'
import { buildVictorySummaryPrompt } from '@/lib/victorySummary'

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

describe('completeBossBattle', () => {
  const userId = 'u1'
  const battleId = 'b1'
  const laneId = 'l1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(userId)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(null as any)
  })

  it('crossing a Fibonacci threshold reports leveledUp with the new rank', async () => {
    const battle = {
      id: battleId,
      laneId,
      challenge: 'Dragon Slayer',
      completedAt: null as unknown as Date,
      lane: { name: 'Warriors', userId }
    }
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(5)
    vi.mocked(generate).mockResolvedValue('Great job!')

    const res = await completeBossBattle(battleId)

    expect(res).toMatchObject({
      ok: true,
      leveledUp: true,
      newLevel: playerLevel(5).level,
      levelName: playerLevel(5).name
    })
  })

  it('a mid-band defeat reports leveledUp false', async () => {
    const battle = {
      id: battleId,
      challenge: 'Dragon Slayer',
      completedAt: null as unknown as Date,
      lane: { name: 'Warriors', userId }
    }
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(4)
    vi.mocked(generate).mockResolvedValue('Great job!')

    const res = await completeBossBattle(battleId)

    expect(res).toMatchObject({
      ok: true,
      leveledUp: false
    })
  })

  it('the summary prompt is built from data and the dashboard revalidates', async () => {
    const battle = {
      id: battleId,
      challenge: 'The Weekly Challenge',
      completedAt: null as unknown as Date,
      lane: { name: 'Warriors', userId }
    }
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(1)
    vi.mocked(generate).mockResolvedValue('Nice work!')

    const res = await completeBossBattle(battleId)

    const expectedPrompt = buildVictorySummaryPrompt({
      laneName: 'Warriors',
      challenge: 'The Weekly Challenge',
      defeats: 1,
      levelName: playerLevel(1).name,
      leveledUp: playerLevel(1).level > playerLevel(0).level
    })

    expect(generate).toHaveBeenCalledWith(expect.stringContaining(expectedPrompt))
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/boss-battles')
    expect(res.ok).toBe(true)
  })

  it('a level-up banks a freeze on the earning lane', async () => {
    const battle = {
      id: battleId,
      laneId,
      challenge: 'Dragon Slayer',
      completedAt: null as unknown as Date,
      lane: { name: 'Warriors', userId, id: laneId }
    }
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(5) // Level up threshold
    vi.mocked(generate).mockResolvedValue('Great job!')

    await completeBossBattle(battleId)

    expect(prisma.streakFreeze.create).toHaveBeenCalledWith({
      data: { laneId: laneId }
    })
  })

  it('a mid-band defeat banks nothing', async () => {
    const battle = {
      id: battleId,
      laneId,
      challenge: 'Dragon Slayer',
      completedAt: null as unknown as Date,
      lane: { name: 'Warriors', userId, id: laneId }
    }
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(4) // No level up
    vi.mocked(generate).mockResolvedValue('Great job!')

    await completeBossBattle(battleId)

    expect(prisma.streakFreeze.create).not.toHaveBeenCalled()
  })
})
