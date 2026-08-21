import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { createCheckIn } from './createCheckIn'

vi.mock('@/lib/db', () => ({ prisma: { checkIn: { upsert: vi.fn() }, lane: { findFirst: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

describe('createCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('a foreign lane returns not-found before writing', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)

    const result = await createCheckIn({
      laneId: 'lane-foreign',
      date,
      isRest: false,
      note: 'test'
    })

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('valid check-in upserts and returns ok', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({
      id: 'lane-1',
      userId: 'u1',
      name: 'Test Lane',
      emoji: '🚀',
      targetPerWeek: 3,
      isActive: true,
      sortOrder: 1,
      createdAt: new Date(0),
      checkIns: [],
      bossBattles: [],
      streakFreezes: []
    } as any)
    vi.mocked(prisma.checkIn.upsert).mockResolvedValue({ id: 'ci-1' } as any)

    const result = await createCheckIn({
      laneId: 'lane-1',
      date,
      isRest: false,
      note: 'test'
    })

    expect(result).toEqual({ ok: true, id: 'ci-1' })
    expect(prisma.checkIn.upsert).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.checkIn.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ laneId_date: { laneId: 'lane-1', date } })
    expect(arg.create).toMatchObject({ laneId: 'lane-1', date, isRest: false })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('missing laneId returns validation error without db call', async () => {
    const result = await createCheckIn({ date, iserm: false })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })
})
