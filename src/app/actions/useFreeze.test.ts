import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { useFreeze } from './useFreeze'

vi.mock('@/lib/db', () => ({
  prisma: { streakFreeze: { findFirst: vi.fn(), update: vi.fn() } },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

describe('useFreeze', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('available freeze is consumed and returns ok', async () => {
    vi.mocked(prisma.streakFreeze.findFirst).mockResolvedValue({
      id: 'fz-1',
    } as any)
    vi.mocked(prisma.streakFreeze.update).mockResolvedValue({ id: 'fz-1' } as any)

    const result = await useFreeze('lane-1', date)

    expect(result).toEqual({ ok: true })
    expect(requireUserId).toHaveBeenCalled()
    expect(prisma.streakFreeze.findFirst).toHaveBeenCalledWith({
      where: {
        laneId: 'lane-1',
        usedDate: null,
        lane: { userId: 'u1' },
      },
    })
    expect(prisma.streakFreeze.update).toHaveBeenCalledWith({
      where: { id: 'fz-1' },
      data: { usedDate: date },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('no available freeze returns no-freeze-available error', async () => {
    vi.mocked(prisma.streakFreeze.findFirst).mockResolvedValue(null)

    const result = await useFreeze('lane-1', date)

    expect(result).toEqual({ ok: false, error: 'no-freeze-available' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("a foreign lane's freeze is never found", async () => {
    // Even if a freeze exists for a different user, the query should filter by lane owner
    // We simulate this by having findFirst return null because the 'where' clause includes the userId check
    vi.mocked(prisma.streakFreeze.findFirst).mockResolvedValue(null)

    const result = await useFreeze('foreign-lane', date)

    expect(result).toEqual({ ok: false, error: 'no-freeze-available' })
    expect(prisma.streakFreeze.findFirst).toHaveBeenCalledWith({
      where: {
        laneId: 'foreign-lane',
        usedDate: null,
        lane: { userId: 'u1' },
      },
    })
  })
})
