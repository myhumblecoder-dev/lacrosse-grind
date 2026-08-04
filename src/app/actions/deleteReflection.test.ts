import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { deleteReflection } from './deleteReflection'

vi.mock('@/lib/db', () => ({ prisma: { weeklyReflection: { delete: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('deleteReflection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes and returns ok', async () => {
    vi.mocked(prisma.weeklyReflection.delete).mockResolvedValue({} as never)
    const result = await deleteReflection('wr-1')
    expect(result).toEqual({ ok: true })
    expect(prisma.weeklyReflection.delete).toHaveBeenCalledWith({ where: { id: 'wr-1' } })
    expect(revalidatePath).toHaveBeenCalledWith('/reflection')
  })

  it('empty id returns missing-id without a db call', async () => {
    const result = await deleteReflection('')
    expect(result).toEqual({ ok: false, error: 'missing-id' })
    expect(prisma.weeklyReflection.delete).not.toHaveBeenCalled()
  })

  it('db error returns not-found', async () => {
    vi.mocked(prisma.weeklyReflection.delete).mockRejectedValue(new Error('x'))
    const result = await deleteReflection('wr-1')
    expect(result).toEqual({ ok: false, error: 'not-found' })
  })
})
