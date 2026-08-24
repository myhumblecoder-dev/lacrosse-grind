import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { spendFreeze } from './spendFreeze'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: { findFirst: vi.fn() },
    streakFreeze: { findFirst: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day))

// Today is Jan 5. Jan 4 is the missed day sitting between today and an
// earlier run, so it is the one day a freeze may be spent on.
const TODAY = d(2026, 0, 5)
const GAP = d(2026, 0, 4)

const laneWithGap = {
  id: 'lane-1',
  checkIns: [
    { date: d(2026, 0, 5), isRest: false },
    { date: d(2026, 0, 3), isRest: false },
    { date: d(2026, 0, 2), isRest: false },
  ],
  streakFreezes: [],
}

describe('spendFreeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T18:00:00.000Z'))
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(laneWithGap as never)
    vi.mocked(prisma.streakFreeze.findFirst).mockResolvedValue({ id: 'fz-1' } as never)
    vi.mocked(prisma.streakFreeze.update).mockResolvedValue({ id: 'fz-1' } as never)
  })

  afterEach(() => vi.useRealTimers())

  it('spends a freeze on the missed day and returns ok', async () => {
    const result = await spendFreeze('lane-1', GAP)

    expect(result).toEqual({ ok: true })
    expect(prisma.streakFreeze.update).toHaveBeenCalledWith({
      where: { id: 'fz-1' },
      data: { usedDate: GAP },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('only ever consults freezes belonging to the signed-in user', async () => {
    await spendFreeze('lane-1', GAP)

    expect(prisma.streakFreeze.findFirst).toHaveBeenCalledWith({
      where: { laneId: 'lane-1', usedDate: null, lane: { userId: 'u1' } },
    })
  })

  it('a foreign lane is refused before anything is spent', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)

    const result = await spendFreeze('foreign-lane', GAP)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('refuses a day the server does not agree is repairable', async () => {
    // A token costs a boss battle, so the page's offer is checked rather than
    // trusted — here the client asks for a day that is not the gap.
    const result = await spendFreeze('lane-1', d(2025, 11, 25))

    expect(result).toEqual({ ok: false, error: 'not-repairable' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
  })

  it('refuses when there is no gap worth bridging', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({
      id: 'lane-1',
      checkIns: [
        { date: d(2026, 0, 5), isRest: false },
        { date: d(2026, 0, 4), isRest: false },
      ],
      streakFreezes: [],
    } as never)

    const result = await spendFreeze('lane-1', GAP)

    expect(result).toEqual({ ok: false, error: 'nothing-to-repair' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
  })

  it('refuses once the bank is empty', async () => {
    vi.mocked(prisma.streakFreeze.findFirst).mockResolvedValue(null)

    const result = await spendFreeze('lane-1', GAP)

    expect(result).toEqual({ ok: false, error: 'no-freeze-available' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('stores the day at UTC midnight however the caller phrased it', async () => {
    await spendFreeze('lane-1', new Date('2026-01-04T22:45:00.000Z'))

    expect(prisma.streakFreeze.update).toHaveBeenCalledWith({
      where: { id: 'fz-1' },
      data: { usedDate: GAP },
    })
  })

  it('a day already frozen cannot be paid for twice', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({
      ...laneWithGap,
      streakFreezes: [{ usedDate: GAP }],
    } as never)

    const result = await spendFreeze('lane-1', GAP)

    expect(result).toEqual({ ok: false, error: 'nothing-to-repair' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
  })

  it('TODAY is never spendable', async () => {
    const result = await spendFreeze('lane-1', TODAY)

    expect(result).toEqual({ ok: false, error: 'not-repairable' })
    expect(prisma.streakFreeze.update).not.toHaveBeenCalled()
  })
})
