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
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('deleteLane', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the lane and its children in a transaction, returns ok', async () => {
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
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('nope'))
    const result = await deleteLane('lane-1')
    expect(result).toEqual({ ok: false, error: 'not-found' })
  })
})
