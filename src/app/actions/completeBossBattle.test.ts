import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { completeBossBattle } from '@/app/actions/completeBossBattle'
import { requireUserId } from '@/lib/tenancy'
import { askCoach } from '@/lib/coach'
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
vi.mock('@/lib/coach', () => ({ askCoach: vi.fn() }))
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
    // Minting a freeze goes through awardFreeze, which confirms the lane is
    // the signed-in user's before banking anything.
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: laneId, userId } as any)
    vi.mocked(prisma.streakFreeze.create).mockResolvedValue({ id: 'fz-1' } as any)
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
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'Great job!' })

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
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'Great job!' })

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
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'Nice work!' })

    const res = await completeBossBattle(battleId)

    const expectedPrompt = buildVictorySummaryPrompt({
      laneName: 'Warriors',
      challenge: 'The Weekly Challenge',
      defeats: 1,
      levelName: playerLevel(1).name,
      leveledUp: playerLevel(1).level > playerLevel(0).level
    })

    expect(askCoach).toHaveBeenCalledWith(expect.any(String), 'victory', expect.stringContaining(expectedPrompt))
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
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'Great job!' })

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
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'Great job!' })

    await completeBossBattle(battleId)

    expect(prisma.streakFreeze.create).not.toHaveBeenCalled()
  })
})

describe('completeBossBattle — the coach running dry must not cost a victory', () => {
  const userId = 'u1'
  const battleId = 'b1'
  const laneId = 'l1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(userId)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(1)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: laneId, userId } as any)
    vi.mocked(prisma.streakFreeze.create).mockResolvedValue({ id: 'fz' } as any)
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue({
      id: battleId, laneId, challenge: 'burpees',
      completedAt: null as unknown as Date,
      lane: { name: 'Wall ball', userId, id: laneId },
    } as any)
  })

  it('records the win when the budget is spent', async () => {
    // The boss is already beaten. Losing that because the coach was out of
    // credit would take back something earned.
    vi.mocked(askCoach).mockResolvedValue({ ok: false, error: 'coach-limit' })

    const res = await completeBossBattle(battleId)

    expect(res).toMatchObject({ ok: true, coachNote: null })
    expect(prisma.bossBattle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completedAt: expect.any(Date) }) })
    )
  })

  it('still banks the level-up freeze when the coach is unavailable', async () => {
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(5) // crosses a threshold
    vi.mocked(askCoach).mockResolvedValue({ ok: false, error: 'coach-limit' })

    const res = await completeBossBattle(battleId)

    expect(res).toMatchObject({ ok: true, leveledUp: true })
    expect(prisma.streakFreeze.create).toHaveBeenCalled()
  })

  it('asks the coach as the victory kind, so spend is attributable', async () => {
    vi.mocked(askCoach).mockResolvedValue({ ok: true, text: 'Well won.' })

    await completeBossBattle(battleId)

    expect(askCoach).toHaveBeenCalledWith(userId, 'victory', expect.any(String))
  })
})
