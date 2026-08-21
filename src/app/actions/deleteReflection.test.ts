import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { deleteReflection } from './deleteReflection'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({ prisma: { weeklyReflection: { deleteMany: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('deleteReflection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('deletes and returns ok', async () => {
    vi.mocked(prisma.weeklyReflection.deleteMany).mockResolvedValue({ count: 1 })
    const result = await deleteReflection('wr-1')
    expect(result).toEqual({ ok: true })
    expect(prisma.weeklyReflection.deleteMany).toHaveBeenCalledWith({
      where: { id: 'wr-1', userId: 'u1' }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/reflection')
  })

  it('empty id returns missing-id without a db call', async () => {
    const result = await deleteReflection('')
    expect(result).toEqual({ ok: false, error: 'missing-id' })
    expect(prisma.weeklyReflection.deleteMany).not.toHaveBeenCalled()
  })

  it("another user's reflection returns not-found", async () => {
    // If count is 0, it means the where clause (id + userId) didn't match any record
    vi.mocked(prisma.weeklyReflection.deleteMany).mockResolvedValue({ count: 0 })
    const result = await deleteReflection('wr-other')
    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.weeklyReflection.deleteMany).toHaveBeenCalledWith({
      where: { id: 'wr-other', userId: 'u1' }
    })
  })
})