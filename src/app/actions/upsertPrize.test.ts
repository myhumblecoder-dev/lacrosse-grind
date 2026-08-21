import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import type { Prize } from '@prisma/client'
import { upsertPrize } from './upsertPrize'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'

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
      where: { userId: 'u1' },
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
      where: { userId: 'u1' },
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
})
