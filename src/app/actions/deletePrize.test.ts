import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { deletePrize } from './deletePrize'

vi.mock('@/lib/db', () => ({
  prisma: {
    prize: {
      delete: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('deletePrize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the singleton row', async () => {
    vi.mocked(db.prize.delete).mockResolvedValue({} as any)

    const res = await deletePrize()

    expect(db.prize.delete).toHaveBeenCalledWith({
      where: { id: 'prize' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/prize')
    expect(res).toEqual({ ok: true })
  })

  it('missing row returns not-found', async () => {
    const error = new Error('Record to delete does not exist.')
    // @ts-expect-error - simulating Prisma error code
    error.code = 'P2025'
    vi.mocked(db.prize.delete).mockRejectedValue(error)

    const res = await deletePrize()

    expect(db.prize.delete).toHaveBeenCalledWith({
      where: { id: 'prize' },
    })
    expect(res).toEqual({ ok: false, error: 'not-found' })
  })
})
