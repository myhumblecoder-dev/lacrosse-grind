import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'
import { deleteCheckIn } from './deleteCheckIn'

vi.mock('@/lib/db', () => ({ prisma: { checkIn: { deleteMany: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn(), requirePlayerId: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))
const stale = new Date(Date.UTC(2025, 11, 20))

// The action refuses a date outside today-or-yesterday, so the clock is pinned
// to the day the fixtures use.
const pinClock = () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-05T18:00:00.000Z'))
}

describe('deleteCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinClock()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(requirePlayerId).mockResolvedValue('p1')
  })

  afterEach(() => vi.useRealTimers())

  it('valid laneId and date deletes and returns ok', async () => {
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 1 })

    const result = await deleteCheckIn('lane-1', date)

    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('the delete is scoped by playerId, not userId', async () => {
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 1 })

    await deleteCheckIn('lane-1', date)

    expect(prisma.checkIn.deleteMany).toHaveBeenCalledWith({
      where: {
        laneId: 'lane-1',
        date,
        lane: { playerId: 'p1' },
      },
    })
  })

  it('yesterday is still within the window', async () => {
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 1 })
    const yesterday = new Date(Date.UTC(2026, 0, 4))

    const result = await deleteCheckIn('lane-1', yesterday)

    expect(result).toEqual({ ok: true })
  })

  it('a day older than the grace window is refused', async () => {
    const result = await deleteCheckIn('lane-1', stale)

    expect(result).toEqual({ ok: false, error: 'outside-window' })
  })

  it('does not delete when the day is outside the window', async () => {
    await deleteCheckIn('lane-1', stale)

    expect(prisma.checkIn.deleteMany).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a future day is refused', async () => {
    const tomorrow = new Date(Date.UTC(2026, 0, 6))

    const result = await deleteCheckIn('lane-1', tomorrow)

    expect(result).toEqual({ ok: false, error: 'outside-window' })
    expect(prisma.checkIn.deleteMany).not.toHaveBeenCalled()
  })

  it('prisma not-found error returns not-found error', async () => {
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 0 })

    const result = await deleteCheckIn('lane-1', date)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("a foreign lane's check-in returns not-found", async () => {
    // A count of 0 means nothing matched — the lane belongs to another player,
    // or the laneId/date is wrong.
    vi.mocked(prisma.checkIn.deleteMany).mockResolvedValue({ count: 0 })

    const result = await deleteCheckIn('foreign-lane', date)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
