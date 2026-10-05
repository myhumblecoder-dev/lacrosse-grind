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
    // Default: nothing stranded, and the player has no prize of their own.
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.prize.findFirst).mockResolvedValue(null)
  })

  it('returns the existing playerId without creating another', async () => {
    vi.mocked(prisma.player.findFirst).mockResolvedValue(
      makePlayer({ id: 'player-existing', userId: 'user-123' })
    )

    const result = await ensureDefaultPlayer()

    expect(result).toEqual({ playerId: 'player-existing' })
    expect(prisma.player.create).not.toHaveBeenCalled()
  })

  it('creates the first player and binds orphan lanes', async () => {
    vi.mocked(prisma.player.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.player.create).mockResolvedValue(
      makePlayer({ id: 'player-new', userId: 'user-123', name: 'Player 1', isDefault: true })
    )

    const result = await ensureDefaultPlayer()

    expect(result).toEqual({ playerId: 'player-new' })
    expect(prisma.player.create).toHaveBeenCalledWith({
      data: { userId: 'user-123', name: 'Player 1', isDefault: true },
    })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', playerId: null },
      data: { playerId: 'player-new' },
    })
  })

  describe('adopting rows stranded without a player', () => {
    // The backfill used to run ONLY on the create branch. A prize saved after the
    // default player existed got playerId null from the old upsertPrize, and was
    // then invisible to every reader and writer. So it runs on both branches now.
    it('binds orphan lanes even when the player already existed', async () => {
      vi.mocked(prisma.player.findFirst).mockResolvedValue(
        makePlayer({ id: 'player-existing', userId: 'user-123' })
      )

      await ensureDefaultPlayer()

      expect(prisma.lane.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', playerId: null },
        data: { playerId: 'player-existing' },
      })
    })

    it('adopts a stranded prize onto the existing player', async () => {
      vi.mocked(prisma.player.findFirst).mockResolvedValue(
        makePlayer({ id: 'player-existing', userId: 'user-123' })
      )
      vi.mocked(prisma.prize.findFirst).mockResolvedValue(makePrize({ id: 'prize-orphan' }))

      await ensureDefaultPlayer()

      expect(prisma.prize.update).toHaveBeenCalledWith({
        where: { id: 'prize-orphan' },
        data: { playerId: 'player-existing' },
      })
    })

    it('adopts one prize by id, never updateMany — Prize.playerId is unique', async () => {
      vi.mocked(prisma.player.findFirst).mockResolvedValue(
        makePlayer({ id: 'player-existing', userId: 'user-123' })
      )
      vi.mocked(prisma.prize.findFirst).mockResolvedValue(makePrize({ id: 'prize-orphan' }))

      await ensureDefaultPlayer()

      // updateMany across two orphans would set the same playerId on both and
      // trip the unique index — and this runs from the root layout, so the throw
      // would blank every page for the account.
      expect(prisma.prize.updateMany).not.toHaveBeenCalled()
      expect(prisma.prize.update).toHaveBeenCalledOnce()
    })

    it('leaves a stranded prize alone when the player already has one', async () => {
      vi.mocked(prisma.player.findFirst).mockResolvedValue(
        makePlayer({ id: 'player-existing', userId: 'user-123' })
      )
      vi.mocked(prisma.prize.findUnique).mockResolvedValue(makePrize({ id: 'prize-own' }))
      vi.mocked(prisma.prize.findFirst).mockResolvedValue(makePrize({ id: 'prize-orphan' }))

      await ensureDefaultPlayer()

      expect(prisma.prize.update).not.toHaveBeenCalled()
    })

    it('writes nothing to the prize when none is stranded', async () => {
      vi.mocked(prisma.player.findFirst).mockResolvedValue(
        makePlayer({ id: 'player-existing', userId: 'user-123' })
      )

      await ensureDefaultPlayer()

      expect(prisma.prize.update).not.toHaveBeenCalled()
    })
  })
})
