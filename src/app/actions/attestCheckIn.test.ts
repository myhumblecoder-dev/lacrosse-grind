import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId, requirePlayerId } from '@/lib/tenancy'
import { getTrainingDay } from '@/lib/trainingDay'
import { hashWitnessPassphrase } from '@/lib/witnessPassphrase'
import { attestCheckIn } from './attestCheckIn'

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    lane: { findFirst: vi.fn() },
    prize: { findUnique: vi.fn() },
    checkIn: { upsert: vi.fn() },
    streakFreeze: { updateMany: vi.fn() },
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn(), requirePlayerId: vi.fn() }))
vi.mock('@/lib/trainingDay', () => ({ getTrainingDay: vi.fn() }))

// amendWindow and witnessPassphrase run for real: the window predicate and the
// hash comparison are the two things this action exists to enforce, and mocking
// either would test nothing.
const PASSPHRASE = 'watched him all week'
const HASH = hashWitnessPassphrase(PASSPHRASE)

// Wednesday; its week runs Mon 2026-09-28 → Sun 2026-10-04.
const WEDNESDAY = new Date(Date.UTC(2026, 8, 30))
const TUESDAY = new Date(Date.UTC(2026, 8, 29))
const LAST_SUNDAY = new Date(Date.UTC(2026, 8, 27))

function validInput(overrides: Record<string, unknown> = {}) {
  return { laneId: 'lane-1', date: TUESDAY, isRest: false, passphrase: PASSPHRASE, ...overrides }
}

describe('attestCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(requirePlayerId).mockResolvedValue('p1')
    vi.mocked(getTrainingDay).mockReturnValue(WEDNESDAY)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: HASH } as never)
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', startsOn: null } as never)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: null } as never)
    vi.mocked(prisma.checkIn.upsert).mockResolvedValue({ id: 'ci-1' } as never)
    vi.mocked(prisma.streakFreeze.updateMany).mockResolvedValue({ count: 0 } as never)
  })

  it('a malformed input is refused before any read', async () => {
    const result = await attestCheckIn({ laneId: '', date: TUESDAY, passphrase: PASSPHRASE })
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('an account with no passphrase set returns no-passphrase', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: null } as never)
    const result = await attestCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'no-passphrase' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('a wrong passphrase returns bad-passphrase and writes nothing', async () => {
    const result = await attestCheckIn(validInput({ passphrase: 'wrong one entirely' }))
    expect(result).toEqual({ ok: false, error: 'bad-passphrase' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('a wrong passphrase is refused before the lane is looked up, so a guess learns nothing', async () => {
    await attestCheckIn(validInput({ passphrase: 'wrong one entirely' }))
    expect(prisma.lane.findFirst).not.toHaveBeenCalled()
  })

  it("a lane belonging to another player returns not-found", async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)
    const result = await attestCheckIn(validInput())
    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('the lane lookup is scoped to the active player', async () => {
    await attestCheckIn(validInput())
    const arg = vi.mocked(prisma.lane.findFirst).mock.calls[0][0]
    expect(arg.where).toEqual({ id: 'lane-1', playerId: 'p1' })
  })

  it('a day before this week Monday returns outside-window', async () => {
    const result = await attestCheckIn(validInput({ date: LAST_SUNDAY }))
    expect(result).toEqual({ ok: false, error: 'outside-window' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })

  it('a day before the lane startsOn returns outside-window', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', startsOn: WEDNESDAY } as never)
    const result = await attestCheckIn(validInput({ date: TUESDAY }))
    expect(result).toEqual({ ok: false, error: 'outside-window' })
  })

  it('a day before the season start returns outside-window', async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: WEDNESDAY } as never)
    const result = await attestCheckIn(validInput({ date: TUESDAY }))
    expect(result).toEqual({ ok: false, error: 'outside-window' })
  })

  it('a valid past day this week upserts with attestedAt set', async () => {
    const result = await attestCheckIn(validInput())
    expect(result).toEqual({ ok: true, id: 'ci-1' })
    expect(prisma.checkIn.upsert).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.checkIn.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ laneId_date: { laneId: 'lane-1', date: TUESDAY } })
    expect(arg.create.attestedAt).toBeInstanceOf(Date)
    expect(arg.update.attestedAt).toBeInstanceOf(Date)
  })

  it('a rest attestation carries isRest true', async () => {
    await attestCheckIn(validInput({ isRest: true }))
    const arg = vi.mocked(prisma.checkIn.upsert).mock.calls[0][0]
    expect(arg.create.isRest).toBe(true)
  })

  it("the witness's note lands in attestedNote, leaving the player's note alone", async () => {
    await attestCheckIn(validInput({ note: 'I drove him, I watched it' }))
    const arg = vi.mocked(prisma.checkIn.upsert).mock.calls[0][0]
    expect(arg.create.attestedNote).toBe('I drove him, I watched it')
    expect(arg.create).not.toHaveProperty('note')
  })

  it('an absent note stores null rather than undefined', async () => {
    await attestCheckIn(validInput())
    const arg = vi.mocked(prisma.checkIn.upsert).mock.calls[0][0]
    expect(arg.create.attestedNote).toBeNull()
  })

  it('refunds a freeze spent on the attested day', async () => {
    await attestCheckIn(validInput())
    expect(prisma.streakFreeze.updateMany).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.streakFreeze.updateMany).mock.calls[0][0]
    expect(arg.where).toEqual({ laneId: 'lane-1', usedDate: TUESDAY })
    expect(arg.data).toEqual({ usedDate: null })
  })

  it('does not attempt a refund when the write was refused', async () => {
    const result = await attestCheckIn(validInput({ date: LAST_SUNDAY }))
    expect(result).toEqual({ ok: false, error: 'outside-window' })
    expect(prisma.streakFreeze.updateMany).not.toHaveBeenCalled()
  })

  it('revalidates the dashboard, the amend page and history on success', async () => {
    await attestCheckIn(validInput())
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/amend')
    expect(revalidatePath).toHaveBeenCalledWith('/history')
  })

  it('revalidates nothing when the write was refused', async () => {
    await attestCheckIn(validInput({ passphrase: 'wrong one entirely' }))
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
