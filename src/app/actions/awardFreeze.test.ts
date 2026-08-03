import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { awardFreeze } from './awardFreeze'

vi.mock('@/lib/db', () => ({ prisma: { streakFreeze: { create: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('awardFreeze', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid laneId creates freeze and returns ok', async () => {
    vi.mocked(prisma.streakFreeze.create).mockResolvedValue({ id: 'fz-1' } as never)

    const result = await awardFreeze('lane-1')

    expect(result).toEqual({ ok: true, id: 'fz-1' })
    expect(prisma.streakFreeze.create).toHaveBeenCalledWith({ data: { laneId: 'lane-1' } })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('empty laneId returns error without db call', async () => {
    const result = await awardFreeze('   ')

    expect(result).toEqual({ ok: false, error: 'missing-laneId' })
    expect(prisma.streakFreeze.create).not.toHaveBeenCalled()
  })
})
