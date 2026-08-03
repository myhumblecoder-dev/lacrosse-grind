import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { deleteCheckIn } from './deleteCheckIn'

vi.mock('@/lib/db', () => ({ prisma: { checkIn: { delete: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

describe('deleteCheckIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid laneId and date deletes and returns ok', async () => {
    vi.mocked(prisma.checkIn.delete).mockResolvedValue({ id: 'ci-1' } as never)

    const result = await deleteCheckIn('lane-1', date)

    expect(result).toEqual({ ok: true })
    expect(prisma.checkIn.delete).toHaveBeenCalledWith({
      where: { laneId_date: { laneId: 'lane-1', date } },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('prisma not-found error returns not-found error', async () => {
    vi.mocked(prisma.checkIn.delete).mockRejectedValue(new Error('Record to delete does not exist.'))

    const result = await deleteCheckIn('lane-1', date)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
