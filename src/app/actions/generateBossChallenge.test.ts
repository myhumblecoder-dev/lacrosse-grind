import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generateBossChallenge } from './generateBossChallenge'
import { requireUserId } from '@/lib/tenancy'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'

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

describe('generateBossChallenge', () => {
  const laneId = 'lane-123'
  const weekStarting = new Date(Date.UTC(2024, 0, 1))
  const userId = 'user-abc'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(userId)
    process.env.COACH_DAILY_LIMIT = '5'
  })

  it('a foreign lane returns not-found before generating', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)

    const result = await generateBossChallenge(laneId, weekStarting)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.lane.findFirst).toHaveBeenCalledWith({
      where: { id: laneId, userId }
    })
    expect(generate).not.toHaveBeenCalled()
  })

  it('an existing challenge is returned without a new generation', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({
      id: laneId,
      name: 'Warriors',
      emoji: '⚔️',
      userId: userId
    } as any)

    vi.mocked(prisma.bossBattle.findUnique).mockResolvedValue({
      challenge: 'Existing Challenge'
    } as any)

    const result = await generateBossChallenge(laneId, weekStarting)

    expect(result).toEqual({ ok: true, challenge: 'Existing Challenge' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('a fresh unlock generates and stores the challenge', async () => {
    const laneName = 'Warriors'
    const laneEmoji = '⚔️'
    const generatedText = 'Defeat the dragon!'

    vi.mocked(prisma.lane.findFirst).mockResolvedValue({
      id: laneId,
      name: laneName,
      emoji: laneEmoji,
      userId: userId
    } as any)

    vi.mocked(prisma.bossBattle.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(generate).mockResolvedValue(generatedText)
    vi.mocked(prisma.bossBattle.upsert).mockResolvedValue({} as any)

    const result = await generateBossChallenge(laneId, weekStarting)

    expect(result).toEqual({ ok: true, challenge: generatedText })
    expect(generate).toHaveBeenCalled()
    expect(prisma.bossBattle.upsert).toHaveBeenCalledWith({
      where: { laneId_weekStarting: { laneId, weekStarting } },
      update: { challenge: generatedText },
      create: { laneId, weekStarting, challenge: generatedText }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/boss-battles')
  })
})