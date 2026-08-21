import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { deleteCheckIn } from './deleteCheckIn'

vi.mock('@/lib/db', () => ({ prisma: { checkIn: { deleteMany: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

describe('deleteCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('valid laneId and date deletes and returns ok', async () => {
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 1 })

    const result = await deleteCheckIn('lane-1', date)

    expect(result).toEqual({ ok: true })
    expect(prisma.checkIn.deleteMany).toHaveBeenCalledWith({
      where: {
        laneId: 'lane-1',
        date,
        lane: { userId: 'u1' },
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('prisma not-found error returns not-found error', async () => {
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 0 })

    const result = await deleteCheckIn('lane-1', date)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("a foreign lane's check-in returns not-found", async () => {
    // If the deleteMany count is 0, it means the record didn't match the criteria
    // (e.g. the lane belongs to a different user or the date/laneId is wrong)
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 0 })

    const result = await deleteCheckIn('foreign-lane', date)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
