import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { setLaneActive } from './setLaneActive'

vi.mock('@/lib/db', () => ({ prisma: { lane: { update: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('setLaneActive', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets isActive and returns ok', async () => {
    vi.mocked(prisma.lane.update).mockResolvedValue({} as never)
    const result = await setLaneActive('lane-1', false)
    expect(result).toEqual({ ok: true })
    expect(prisma.lane.update).toHaveBeenCalledWith({
      where: { id: 'lane-1' },
      data: { isActive: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('empty id returns missing-id without a db call', async () => {
    const result = await setLaneActive('', true)
    expect(result).toEqual({ ok: false, error: 'missing-id' })
    expect(prisma.lane.update).not.toHaveBeenCalled()
  })
})
