import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import type { Lane, Prize, Player } from '@prisma/client'
import { ensureDefaultPlayer } from './ensureDefaultPlayer'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    laneTarget: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    checkIn: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    bossBattle: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    streakFreeze: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    coachCall: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    prize: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    player: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    user: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    account: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    session: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    verificationToken: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn() },
  },
}))

vi.mock('@/lib/tenancy', () => ({
  requireUserId: vi.fn(() => 'user-123'),
}))

const makeLane = (overrides: Partial<Lane> = {}): Lane =>
  ({
    id: '',
    userId: '',
    playerId: '',
    name: '',
    emoji: '',
    targetPerWeek: 0,
    isActive: false,
    sortOrder: 0,
    startsOn: new Date(Date.UTC(2024, 0, 1)),
    createdAt: new Date(Date.UTC(2024, 0, 1)),
    ...overrides,
  } as unknown as Lane)

const makePrize = (overrides: Partial<Prize> = {}): Prize =>
  ({
    id: '',
    userId: '',
    playerId: '',
    title: '',
    description: '',
    photoUrl: '',
    seasonStart: new Date(Date.UTC(2024, 0, 1)),
    createdAt: new Date(Date.UTC(2024, 0, 1)),
    updatedAt: new Date(Date.UTC(2024, 0, 1)),
    ...overrides,
  } as unknown as Prize)

const makePlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: '',
    userId: '',
    name: '',
    isDefault: false,
    createdAt: new Date(Date.UTC(2024, 0, 1)),
    updatedAt: new Date(Date.UTC(2024, 0, 1)),
    ...overrides,
  } as unknown as Player)

describe('ensureDefaultPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing playerId without creating when player row exists', async () => {
    const existingPlayer = makePlayer({ id: 'player-existing', userId: 'user-123' })
    vi.mocked(prisma.player.findFirst).mockResolvedValue(existingPlayer)

    const result = await ensureDefaultPlayer()

    expect(result).toEqual({ playerId: 'player-existing' })
    expect(prisma.player.create).not.toHaveBeenCalled()
    expect(prisma.lane.updateMany).not.toHaveBeenCalled()
    expect(prisma.prize.updateMany).not.toHaveBeenCalled()
  })

  it('creates player and binds orphan lanes and prizes when no players exist', async () => {
    const newPlayer = makePlayer({ id: 'player-new', userId: 'user-123', name: 'Player 1', isDefault: true })
    vi.mocked(prisma.player.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.player.create).mockResolvedValue(newPlayer)

    const result = await ensureDefaultPlayer()

    expect(result).toEqual({ playerId: 'player-new' })
    expect(prisma.player.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        name: 'Player 1',
        isDefault: true,
      },
    })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', playerId: null },
      data: { playerId: 'player-new' },
    })
    expect(prisma.prize.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', playerId: null },
      data: { playerId: 'player-new' },
    })
  })

  it('does not call updateMany when player already exists', async () => {
    const existingPlayer = makePlayer({ id: 'player-existing', userId: 'user-123' })
    vi.mocked(prisma.player.findFirst).mockResolvedValue(existingPlayer)

    await ensureDefaultPlayer()

    expect(prisma.lane.updateMany).not.toHaveBeenCalled()
    expect(prisma.prize.updateMany).not.toHaveBeenCalled()
  })
})
