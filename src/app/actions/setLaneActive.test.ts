import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { setLaneActive } from './setLaneActive'

vi.mock('@/lib/db', () => ({ prisma: { lane: { updateMany: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('setLaneActive', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('sets isActive and returns ok', async () => {
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })
    
    const result = await setLaneActive('lane-1', false)
    
    expect(result).toEqual({ ok: true })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'lane-1', userId: 'u1' },
      data: { isActive: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('empty id returns missing-id without a db call', async () => {
    const result = await setLaneActive('', true)
    expect(result).toEqual({ ok: false, error: 'missing-id' })
    expect(prisma.lane.updateMany).not.toHaveBeenCalled()
  })

  it("another user's lane id returns not-found", async () => {
    // When count is 0, it means the where clause (id + userId) didn't match any record
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 0 })

    const result = await setLaneActive('other-lane-id', true)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'other-lane-id', userId: 'u1' },
      data: { isActive: true },
    })
  })
})
