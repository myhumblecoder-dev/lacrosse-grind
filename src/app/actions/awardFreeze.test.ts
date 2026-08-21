import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { awardFreeze } from './awardFreeze'

vi.mock('@/lib/db', () => ({ prisma: { streakFreeze: { create: vi.fn() }, lane: { findFirst: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('awardFreeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('valid laneId creates freeze and returns ok', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', userId: 'u1' } as never)
    vi.mocked(prisma.streakFreeze.create).mockResolvedValue({ id: 'fz-1' } as never)

    const result = await awardFreeze('lane-1')

    expect(result).toEqual({ ok: true, id: 'fz-1' })
    expect(prisma.lane.findFirst).toHaveBeenCalledWith({
      where: { id: 'lane-1', userId: 'u1' }
    })
    expect(prisma.streakFreeze.create).toHaveBeenCalledWith({ data: { laneId: 'lane-1' } })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('empty laneId returns error without db call', async () => {
    const result = await awardFreeze('   ')

    expect(result).toEqual({ ok: false, error: 'missing-laneId' })
    expect(prisma.lane.findFirst).not.toHaveBeenCalled()
    expect(prisma.streakFreeze.create).not.toHaveBeenCalled()
  })

  it('a foreign lane returns not-found', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)

    const result = await awardFreeze('lane-foreign')

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.lane.findFirst).toHaveBeenCalledWith({
      where: { id: 'lane-foreign', userId: 'u1' }
    })
    expect(prisma.streakFreeze.create).not.toHaveBeenCalled()
  })
})
