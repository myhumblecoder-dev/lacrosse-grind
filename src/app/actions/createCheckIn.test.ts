import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'
import { createCheckIn } from './createCheckIn'

vi.mock('@/lib/db', () => ({ prisma: { checkIn: { upsert: vi.fn() }, lane: { findFirst: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn(), requirePlayerId: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

// The action now refuses a date outside today-or-yesterday, so the clock is
// pinned to the day these fixtures use.
const pinClock = () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-05T18:00:00.000Z'))
}

describe('createCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinClock()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(requirePlayerId).mockResolvedValue('p1')
  })

  afterEach(() => vi.useRealTimers())

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

describe('createCheckIn — the date is not the caller\'s to choose freely', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T18:00:00.000Z'))
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1' } as never)
  })

  afterEach(() => vi.useRealTimers())

  it('refuses a season fabricated by back-dating', async () => {
    // The card only ever sends today, but the action is callable directly.
    const result = await createCheckIn({
      laneId: 'lane-1', date: new Date(Date.UTC(2025, 10, 1)), isRest: false,
    })

    expect(result).toEqual({ ok: false, error: 'outside-window' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('refuses a day that has not happened yet', async () => {
    // History takes its weeks from the check-ins themselves, so a future date
    // would put a phantom week on the page.
    const result = await createCheckIn({
      laneId: 'lane-1', date: new Date(Date.UTC(2099, 0, 1)), isRest: false,
    })

    expect(result).toEqual({ ok: false, error: 'outside-window' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('still accepts yesterday', async () => {
    vi.mocked(prisma.checkIn.upsert).mockResolvedValue({ id: 'c1' } as never)

    const result = await createCheckIn({
      laneId: 'lane-1', date: new Date(Date.UTC(2026, 0, 4)), isRest: false,
    })

    expect(result).toEqual({ ok: true, id: 'c1' })
  })

  it('lane lookup uses playerId from requirePlayerId', async () => {
    await createCheckIn({ laneId: 'l1', date, isRest: false })
    expect(prisma.lane.findFirst).toHaveBeenCalledOnce()
    expect(prisma.lane.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ playerId: 'p1' }) }))
  })

  it('returns not-found when lane belongs to different player', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null as never)
    const out = await createCheckIn({ laneId: 'l-foreign', date: '2026-08-27' })
    expect(out.ok).toBe(false)
  })
})
