import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { completeBossBattle } from '@/app/actions/completeBossBattle'
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

describe('completeBossBattle', () => {
  const userId = 'u1'
  const battleId = 'b1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(userId)
  })

  it('a foreign battle returns not-found', async () => {
    // Mock finding a battle that belongs to a different user
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(null)

    const res = await completeBossBattle(battleId)

    expect(res).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.bossBattle.update).not.toHaveBeenCalled()
  })

  it('an LLM failure still completes the battle with a null note', async () => {
    const battle = {
      id: battleId,
      challenge: 'Dragon Slayer',
      completedAt: null as unknown as Date,
    }
    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(generate).mockRejectedValue(new Error('LLM Down'))

    const res = await completeBossBattle(battleId)

    expect(res).toEqual({ ok: true, coachNote: null })
    expect(prisma.bossBattle.update).toHaveBeenCalledWith({
      where: { id: battleId },
      data: expect.objectContaining({ coachNote: null }),
    })
  })

  it('victory stamps completedAt and stores the note', async () => {
    const challengeName = 'Dragon Slayer'
    const coachNoteText = 'Great job!'
    const battle = {
      id: battleId,
      challenge: challengeName,
      completedAt: null as unknown as Date,
    }

    vi.mocked(prisma.bossBattle.findFirst).mockResolvedValue(battle as any)
    vi.mocked(generate).mockResolvedValue(coachNoteText)

    const res = await completeBossBattle(battleId)

    expect(res).toEqual({ ok: true, coachNote: coachNoteText })
    expect(prisma.bossBattle.update).toHaveBeenCalledWith({
      where: { id: battleId },
      data: expect.objectContaining({
        completedAt: expect.any(Date),
        coachNote: coachNoteText,
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith('/boss-battles')
  })
}) 