import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { useFreeze } from './useFreeze'

vi.mock('@/lib/db', () => ({
  prisma: { streakFreeze: { findFirst: vi.fn(), update: vi.fn() } },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

describe('useFreeze', () => {
  beforeEach(() => vi.clearAllMocks())

  it('available freeze is consumed and returns ok', async () => {
    vi.mocked(prisma.streakFreeze.findFirst).mockResolvedValue({ id: 'fz-1' } as never)
    vi.mocked(prisma.streakFreeze.update).mockResolvedValue({ id: 'fz-1' } as never)

    const result = await useFreeze('lane-1', date)

    expect(result).toEqual({ ok: true })
    expect(prisma.streakFreeze.findFirst).toHaveBeenCalledWith({
      where: { laneId: 'lane-1', usedDate: null },
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
})
