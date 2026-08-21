import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { deletePrize } from './deletePrize'

vi.mock('@/lib/db', () => ({
  prisma: {
    prize: {
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/tenancy', () => ({
  requireUserId: vi.fn(),
}))

describe('deletePrize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('deleting with no prize row returns not-found', async () => {
    vi.mocked(db.prize.deleteMany).mockResolvedValue({ count: 0 })

    const res = await deletePrize()

    expect(db.prize.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    })
    expect(res).toEqual({ ok: false, error: 'not-found' })
  })

  it('the delete is scoped to the owner', async () => {
    vi.mocked(db.prize.deleteMany).mockResolvedValue({ count: 1 })

    const res = await deletePrize()

    expect(db.prize.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/prize')
    expect(res).toEqual({ ok: true })
  })
})
