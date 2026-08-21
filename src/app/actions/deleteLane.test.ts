import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { deleteLane } from './deleteLane'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    checkIn: { deleteMany: vi.fn() },
    bossBattle: { deleteMany: vi.fn() },
    streakFreeze: { deleteMany: vi.fn() },
    lane: { delete: vi.fn(), findFirst: vi.fn() },
    prize: { findUnique: vi.fn() },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/tenancy', () => ({
  requireUserId: vi.fn(),
}))

describe('deleteLane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('another user\'s lane id returns not-found without deleting', async () => {
    // Arrange: the OWNER-SCOPED lookup finds nothing for a foreign lane —
    // mocking it to return another user's row would bypass the very where
    // clause this story adds.
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)
    
    // Ensure prize check passes (no season running)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: null } as any)

    // Act
    const result = await deleteLane('lane-other')

    // Assert
    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('the season check reads the signed-in user\'s prize row', async () => {
    // Arrange: season is running for the authenticated user
    const seasonStart = new Date(Date.UTC(2024, 0, 1))
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      userId: 'u1',
      seasonStart,
    } as any)

    // Act
    const result = await deleteLane('lane-123')

    // Assert
    expect(result).toEqual({ ok: false, error: 'season-running' })
    expect(prisma.prize.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('a started season refuses the delete and touches no rows', async () => {
    // Arrange: seasonStart is set (season is running)
    const seasonStart = new Date(Date.UTC(2024, 0, 1))
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      id: 'prize',
      title: 'Test Prize',
      seasonStart,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      description: null,
      reasons: [],
      photoUrl: null,
    } as any)

    // Act
    const result = await deleteLane('lane-123')

    // Assert
    expect(result).toEqual({ ok: false, error: 'season-running' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a season that has not started deletes as before', async () => {
    // Arrange: seasonStart is null (season not running)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      seasonStart: null,
    } as any)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({
      id: 'lane-123',
      userId: 'u1',
    } as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    // Act
    const result = await deleteLane('lane-123')

    // Assert
    expect(result).toEqual({ ok: true })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('deletes the lane and its children in a transaction, returns ok', async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: null } as any)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', userId: 'u1' } as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    const result = await deleteLane('lane-1')

    expect(result).toEqual({ ok: true })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('empty id returns missing-id without a db call', async () => {
    const result = await deleteLane('')

    expect(result).toEqual({ ok: false, error: 'missing-id' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('db error returns not-found', async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: null } as any)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', userId: 'u1' } as any)
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('nope'))

    const result = await deleteLane('lane-1')

    expect(result).toEqual({ ok: false, error: 'not-found' })
  })
})
