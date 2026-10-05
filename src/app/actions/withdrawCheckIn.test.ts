import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'
import { getTrainingDay } from '@/lib/trainingDay'
import { hashWitnessPassphrase } from '@/lib/witnessPassphrase'
import { withdrawCheckIn } from './withdrawCheckIn'

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    lane: { findFirst: vi.fn() },
    prize: { findUnique: vi.fn() },
    checkIn: { findUnique: vi.fn(), delete: vi.fn() },
    checkInRemoval: { create: vi.fn() },
    streakFreeze: { updateMany: vi.fn() },
    bossBattle: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn(), requirePlayerId: vi.fn() }))
vi.mock('@/lib/trainingDay', () => ({ getTrainingDay: vi.fn() }))

const PASSPHRASE = 'watched him all week'
const HASH = hashWitnessPassphrase(PASSPHRASE)

// Wednesday; its week runs Mon 2026-09-28 → Sun 2026-10-04.
const WEDNESDAY = new Date(Date.UTC(2026, 8, 30))
const TUESDAY = new Date(Date.UTC(2026, 8, 29))
const LAST_SUNDAY = new Date(Date.UTC(2026, 8, 27))

function validInput(overrides: Record<string, unknown> = {}) {
  return { laneId: 'lane-1', date: TUESDAY, passphrase: PASSPHRASE, ...overrides }
}

describe('withdrawCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(requirePlayerId).mockResolvedValue('p1')
    vi.mocked(getTrainingDay).mockReturnValue(WEDNESDAY)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: HASH } as never)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', startsOn: null } as never)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: null } as never)
    vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({ isRest: false } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)
  })

  it('a malformed input is refused before any read', async () => {
    const result = await withdrawCheckIn({ laneId: '', date: TUESDAY, passphrase: PASSPHRASE })
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('an account with no passphrase set returns no-passphrase', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: null } as never)
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'no-passphrase' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('a wrong passphrase returns bad-passphrase and deletes nothing', async () => {
    const result = await withdrawCheckIn(validInput({ passphrase: 'wrong one entirely' }))
    expect(result).toEqual({ ok: false, error: 'bad-passphrase' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('a wrong passphrase is refused before the lane is looked up', async () => {
    await withdrawCheckIn(validInput({ passphrase: 'wrong one entirely' }))
    expect(prisma.lane.findFirst).not.toHaveBeenCalled()
  })

  it('a lane belonging to another player returns not-found', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('the lane lookup is scoped to the active player', async () => {
    await withdrawCheckIn(validInput())
    expect(prisma.lane.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lane-1', playerId: 'p1' } }))
  })

  it('a day before this week Monday returns outside-window', async () => {
    const result = await withdrawCheckIn(validInput({ date: LAST_SUNDAY }))
    expect(result).toEqual({ ok: false, error: 'outside-window' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('a day that was never marked returns not-found', async () => {
    vi.mocked(prisma.checkIn.findUnique).mockResolvedValue(null)
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('deletes the check-in and logs the removal in one transaction', async () => {
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: true })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(prisma.checkIn.delete).toHaveBeenCalledWith({
      where: { laneId_date: { laneId: 'lane-1', date: TUESDAY } },
    })
    expect(prisma.checkInRemoval.create).toHaveBeenCalledOnce()
  })

  it('the removal records wasRest from the deleted row', async () => {
    vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({ isRest: true } as never)
    await withdrawCheckIn(validInput())
    const arg = vi.mocked(prisma.checkInRemoval.create).mock.calls[0][0]
    expect(arg.data.wasRest).toBe(true)
    expect(arg.data.date).toEqual(TUESDAY)
    expect(arg.data.laneId).toBe('lane-1')
  })

  it("the witness's note is kept on the removal", async () => {
    await withdrawCheckIn(validInput({ note: 'he was at his cousin all day' }))
    const arg = vi.mocked(prisma.checkInRemoval.create).mock.calls[0][0]
    expect(arg.data.note).toBe('he was at his cousin all day')
  })

  it('an absent note stores null rather than undefined', async () => {
    await withdrawCheckIn(validInput())
    const arg = vi.mocked(prisma.checkInRemoval.create).mock.calls[0][0]
    expect(arg.data.note).toBeNull()
  })

  it('returns not-found when the row vanished under it (P2025)', async () => {
    const gone = Object.assign(new Error('gone'), { code: 'P2025' })
    vi.mocked(prisma.$transaction).mockRejectedValue(gone)
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'not-found' })
  })

  it('an outage is write-failed, not a missing row', async () => {
    const down = Object.assign(new Error('connection refused'), { code: 'P1001' })
    vi.mocked(prisma.$transaction).mockRejectedValue(down)
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'write-failed' })
  })

  it('an error with no Prisma code is write-failed', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('kaboom'))
    const result = await withdrawCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'write-failed' })
  })

  it('does not revalidate when the transaction throws', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('gone'))
    await withdrawCheckIn(validInput())
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('never re-spends a freeze token', async () => {
    await withdrawCheckIn(validInput())
    expect(prisma.streakFreeze.updateMany).not.toHaveBeenCalled()
  })

  it('never unwinds a boss battle', async () => {
    await withdrawCheckIn(validInput())
    expect(prisma.bossBattle.update).not.toHaveBeenCalled()
  })

  it('revalidates the dashboard, the amend page and history on success', async () => {
    await withdrawCheckIn(validInput())
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/amend')
    expect(revalidatePath).toHaveBeenCalledWith('/history')
  })

  it('pins a mid-afternoon date to UTC midnight, so the grid and the delete agree', async () => {
    await withdrawCheckIn(validInput({ date: new Date('2026-09-29T18:45:00.000Z') }))

    expect(prisma.checkIn.delete).toHaveBeenCalledWith({
      where: { laneId_date: { laneId: 'lane-1', date: TUESDAY } },
    })
  })
})
