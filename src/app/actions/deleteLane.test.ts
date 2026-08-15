import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { deleteLane } from './deleteLane'

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    checkIn: { deleteMany: vi.fn() },
    bossBattle: { deleteMany: vi.fn() },
    streakFreeze: { deleteMany: vi.fn() },
    lane: { delete: vi.fn() },
    prize: { findUnique: vi.fn() },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('deleteLane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      id: 'prize',
      seasonStart: null,
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
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null as never)
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
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('nope'))

    const result = await deleteLane('lane-1')

    expect(result).toEqual({ ok: false, error: 'not-found' })
  })
})
