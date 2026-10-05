import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import type { Prize } from '@prisma/client'
import { upsertPrize } from './upsertPrize'
import { revalidatePath } from 'next/cache'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'

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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/tenancy', () => ({
  requireUserId: vi.fn(),
  requirePlayerId: vi.fn(),
}))

const makePrize = (overrides: Partial<Prize> = {}): Prize =>
  ({
    id: '',
    title: '',
    description: '',
    reasons: [],
    photoUrl: '',
    createdAt: new Date(Date.UTC(2024, 0, 1)),
    updatedAt: new Date(Date.UTC(2024, 0, 1)),
    ...overrides,
  } as unknown as Prize)

describe('upsertPrize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
vi.mocked(requirePlayerId).mockResolvedValue('p1')
  })

  it('the upsert keys on the signed-in user', async () => {
    const input = {
      title: 'Epic Victory',
      description: 'A great prize',
      reasons: ['Hard work'],
      photoUrl: 'https://example.com/photo.png',
    }

    vi.mocked(db.prize.upsert).mockResolvedValue(makePrize({ id: 'p1' }))

    await upsertPrize(input)

    expect(requireUserId).toHaveBeenCalled()
    expect(db.prize.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { playerId: 'p1' },
    }))
  })

  it('the returned id comes from the upserted row', async () => {
    const input = {
      title: 'Epic Victory',
      description: 'A great prize',
      reasons: ['Hard work'],
      photoUrl: 'https://example.com/photo.png',
    }

    const prizeId = 'p123'
    vi.mocked(db.prize.upsert).mockResolvedValue(makePrize({ id: prizeId }))

    const res = await upsertPrize(input)

    expect(res).toEqual({ ok: true, id: prizeId })
  })

  it('valid input upserts the singleton row', async () => {
    const input = {
      title: 'Epic Victory',
      description: 'A great prize',
      reasons: ['Hard work'],
      photoUrl: 'https://example.com/photo.png',
    }

    vi.mocked(db.prize.upsert).mockResolvedValue(makePrize({ id: 'p123', title: 'Epic Victory' }))

    const res = await upsertPrize(input)

    expect(res).toEqual({ ok: true, id: 'p123' })
    expect(db.prize.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { playerId: 'p1' },
      update: expect.objectContaining({
        title: 'Epic Victory',
        photoUrl: 'https://example.com/photo.png',
      }),
      create: expect.objectContaining({
        userId: 'u1',
        title: 'Epic Victory',
      }),
    }))
    expect(revalidatePath).toHaveBeenCalledWith('/prize')
  })

  it('empty title returns a validation error', async () => {
    const input = {
      title: '', // Invalid according to schema
      description: 'No title',
    }

    const res = await upsertPrize(input)

    expect(res).toEqual({ ok: false, error: 'validation' })
    expect(db.prize.upsert).not.toHaveBeenCalled()
  })

  it('validation failure skips the database', async () => {
    const input = {}

    const res = await upsertPrize(input)

    expect(res).toEqual({ ok: false, error: 'validation' })
    expect(db.prize.upsert).not.toHaveBeenCalled()
  })

  describe('two kids on one account', () => {
    it('keys the upsert on the player, so a second kid cannot overwrite the first', async () => {
      vi.mocked(db.prize.upsert).mockResolvedValue(makePrize())

      await upsertPrize({ title: 'A new stick', reasons: [], photoUrl: null })

      const arg = vi.mocked(db.prize.upsert).mock.calls[0][0]
      expect(arg.where).toEqual({ playerId: 'p1' })
      // Keyed on userId it found the sibling's row and updated it in place.
      expect(arg.where).not.toHaveProperty('userId')
    })

    it('stamps playerId on a new prize, so the prize page can find it', async () => {
      vi.mocked(db.prize.upsert).mockResolvedValue(makePrize())

      await upsertPrize({ title: 'A new stick', reasons: [], photoUrl: null })

      const arg = vi.mocked(db.prize.upsert).mock.calls[0][0]
      // The create used to set userId alone, so every reader — all of which look
      // the prize up by playerId — found nothing for either kid.
      expect(arg.create).toMatchObject({ playerId: 'p1', userId: 'u1' })
    })

    it('reads the carried-over photo from this player\'s row', async () => {
      vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: 'https://x/p.jpg' }))
      vi.mocked(db.prize.upsert).mockResolvedValue(makePrize())

      // No photoUrl key at all: the action keeps whatever is on the row.
      await upsertPrize({ title: 'A new stick', reasons: [] })

      expect(db.prize.findUnique).toHaveBeenCalledWith({
        where: { playerId: 'p1' },
        select: { photoUrl: true },
      })
    })
  })
})
