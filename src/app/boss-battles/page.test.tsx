import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { prisma as db } from '@/lib/db'
import { getLastCompletedWeekStart, getWeekStart, formatWeekLabel } from '@/lib/weekUtils'
import { getTrainingDay } from '@/lib/trainingDay'
import { getViewer } from '@/lib/viewer'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      findMany: vi.fn(),
    },
    checkIn: {
      findMany: vi.fn(),
    },
    bossBattle: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/viewer', () => ({ getViewer: vi.fn() }))

// next/font's loader only exists inside the Next build; under vitest
// `Geist(...)` is not a function and the suite dies at module load.
vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1' })
    // Persistent default: any call not overridden by a test's Once
    // (i.e. the second, inactive-lanes call) resolves empty. A Once here
    // would be consumed FIFO by the FIRST (active) call instead.
    vi.mocked(db.lane.findMany).mockResolvedValue([])
    vi.mocked(db.bossBattle.count).mockResolvedValue(0)
  })

  it('both lane queries are scoped to the signed-in user', async () => {
    const userId = 'u1'
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId })

    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 2,
      isActive: true,
      sortOrder: 1,
      checkIns: [],
      bossBattles: [],
    } as any

    // First call: active lanes
    vi.mocked(db.lane.findMany).mockResolvedValueOnce([
      { ...lane, userId }
    ])
    // Second call: inactive lanes
    vi.mocked(db.lane.findMany).mockResolvedValueOnce([])

    const PageComponent = await Page()
    render(PageComponent)

    expect(db.lane.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: userId, isActive: true })
    }))
    expect(db.lane.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: userId, isActive: false })
    }))
  })

  it('a lane that only started this Monday wakes no boss for last week', async () => {
    // The swap case: a lane traded back in mid-week starts the coming Monday,
    // and check-ins left over from an earlier stint must not wake a grace
    // boss for a week it spent retired. `startsOn` equals this week's Monday,
    // so a guard tested against THIS week would let it through.
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    const lastWeekStart = getLastCompletedWeekStart(trainingDay)

    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 2,
      isActive: true,
      sortOrder: 1,
      startsOn: thisWeekStart,
      checkIns: [
        { date: new Date(lastWeekStart.getTime() + 86400000), laneId: 'l1', isRest: false },
        { date: new Date(lastWeekStart.getTime() + 172800000), laneId: 'l1', isRest: false },
      ],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByText(/Last week's unfought boss/)).not.toBeInTheDocument()
  })

  it('a lane running last week still gets its grace boss', async () => {
    // The control for the test above: same data, but the lane started before
    // last week, so the guard must not swallow a boss it genuinely earned.
    const trainingDay = getTrainingDay(new Date())
    const lastWeekStart = getLastCompletedWeekStart(trainingDay)

    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 2,
      isActive: true,
      sortOrder: 1,
      startsOn: new Date(lastWeekStart.getTime() - 7 * 86400000),
      checkIns: [
        { date: new Date(lastWeekStart.getTime() + 86400000), laneId: 'l1', isRest: false },
        { date: new Date(lastWeekStart.getTime() + 172800000), laneId: 'l1', isRest: false },
      ],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(
      screen.getByText(`Last week's unfought boss — ${formatWeekLabel(lastWeekStart)}`)
    ).toBeInTheDocument()
  })

  it('an unfought last-week victory stays fightable', async () => {
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    const lastWeekStart = getLastCompletedWeekStart(trainingDay)

    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 2,
      isActive: true,
      sortOrder: 1,
      checkIns: [
        { date: new Date(lastWeekStart.getTime() + 86400000), laneId: 'l1', isRest: false },
        { date: new Date(lastWeekStart.getTime() + 172800000), laneId: 'l1', isRest: false },
      ],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.getByText(`Last week's unfought boss — ${formatWeekLabel(lastWeekStart)}`)).toBeInTheDocument()
    expect(screen.getAllByText(/💪 Strength/)).toHaveLength(2)
    expect(screen.getAllByTestId('face-boss').length).toBeGreaterThanOrEqual(1)
  })

  it('a fought last week stays quiet', async () => {
    const trainingDay = getTrainingDay(new Date())
    const lastWeekStart = getLastCompletedWeekStart(trainingDay)

    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 2,
      isActive: true,
      sortOrder: 1,
      checkIns: [
        { date: new Date(lastWeekStart.getTime() + 86400000), laneId: 'l1', isRest: false },
        { date: new Date(lastWeekStart.getTime() + 172800000), laneId: 'l1', isRest: false },
      ],
      bossBattles: [{ weekStarting: lastWeekStart, challenge: 'burpees', completedAt: new Date(), coachNote: 'Good' }],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByText(/Last week's unfought boss/)).not.toBeInTheDocument()
  })

  it('a missed last week stays quiet', async () => {
    const trainingDay = getTrainingDay(new Date())
    const lastWeekStart = getLastCompletedWeekStart(trainingDay)

    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 2,
      isActive: true,
      sortOrder: 1,
      checkIns: [
        { date: new Date(lastWeekStart.getTime() + 86400000), laneId: 'l1', isRest: false },
      ],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByText(/Last week's unfought boss/)).not.toBeInTheDocument()
  })

  it('a lane below target shows the unlock nudge', async () => {
    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 5,
      isActive: true,
      sortOrder: 1,
      checkIns: [
        { date: new Date(), laneId: 'l1', isRest: false },
        { date: new Date(), laneId: 'l1', isRest: false },
        { date: new Date(), laneId: 'l1', isRest: false },
      ],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.getByText((_, el) => el?.textContent === '3 / 5 days')).toBeInTheDocument()
    expect(screen.getByTestId('battle-locked')).toHaveTextContent('Hit your target to unlock this week\'s boss.')
    expect(screen.queryByText('✅ Target hit')).not.toBeInTheDocument()
  })

  it('a lane at target unlocks the battle', async () => {
    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 5,
      isActive: true,
      sortOrder: 1,
      checkIns: [
        { date: new Date(), laneId: 'l1', isRest: false },
        { date: new Date(), laneId: 'l1', isRest: false },
        { date: new Date(), laneId: 'l1', isRest: false },
        { date: new Date(), laneId: 'l1', isRest: false },
        { date: new Date(), laneId: 'l1', isRest: false },
      ],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.getByText('✅ Target hit')).toBeInTheDocument()
    expect(screen.getByTestId('face-boss')).toBeInTheDocument()
    expect(screen.queryByTestId('battle-locked')).not.toBeInTheDocument()
  })

  it('the header names the current week', async () => {
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    const lane = {
      id: 'l1',
      name: 'Strength',
      emoji: '💪',
      targetPerWeek: 5,
      isActive: true,
      sortOrder: 1,
      checkIns: [],
      bossBattles: [],
    } as any

    vi.mocked(db.lane.findMany).mockResolvedValueOnce([lane])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`Boss Battles — week of ${formatWeekLabel(thisWeekStart)}`)
  })

  it('an active challenge offers I beat it and one re-roll', async () => {
    const { prisma } = await import('@/lib/db')
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    vi.mocked(prisma.lane.findMany).mockResolvedValueOnce([
      {
        id: 'l1', name: 'Pushups', emoji: '💪', targetPerWeek: 2, isActive: true, sortOrder: 1,
        checkIns: [
          { date: new Date(thisWeekStart.getTime() + 3600000), laneId: 'l1', isRest: false },
          { date: new Date(thisWeekStart.getTime() + 90000000), laneId: 'l1', isRest: false },
        ],
        bossBattles: [{ id: 'b1', weekStarting: thisWeekStart, challenge: '3 sets of 5 burpees', rerollCount: 0, completedAt: null, coachNote: null }],
      },
    ] as never)

    render(await Page())

    expect(screen.getByTestId('boss-challenge')).toHaveTextContent('3 sets of 5 burpees')
    expect(screen.getByTestId('beat-boss')).toBeInTheDocument()
    expect(screen.getByTestId('reroll-boss')).toBeInTheDocument()
  })

  it('a defeated boss celebrates with the coach note', async () => {
    const { prisma } = await import('@/lib/db')
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    vi.mocked(prisma.lane.findMany).mockResolvedValueOnce([
      {
        id: 'l1', name: 'Pushups', emoji: '💪', targetPerWeek: 1, isActive: true, sortOrder: 1,
        checkIns: [{ date: new Date(thisWeekStart.getTime() + 3600000), laneId: 'l1', isRest: false }],
        bossBattles: [{ id: 'b1', weekStarting: thisWeekStart, challenge: '3 sets of 5 burpees', rerollCount: 1, completedAt: new Date(), coachNote: 'Burpees fear you now.' }],
      },
    ] as never)

    render(await Page())

    expect(screen.getByTestId('boss-defeated')).toBeInTheDocument()
    expect(screen.getByTestId('coach-note')).toHaveTextContent('Burpees fear you now.')
    expect(screen.queryByTestId('beat-boss')).not.toBeInTheDocument()
  })
})

describe('Page — the boss wakes on the season\'s count', () => {
  const day = (iso: string) => new Date(iso + 'T00:00:00.000Z')

  it('does not wake a boss on a week the prize grid will score as missed', async () => {
    // Three rest days against a target of three. Raw that is 3/3 and the boss
    // used to wake; the season counts it as 1, so the week is not earned.
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    vi.mocked(db.lane.findMany).mockResolvedValueOnce([{
      id: 'l1', name: 'Wall ball', emoji: '🥍', targetPerWeek: 3,
      isActive: true, sortOrder: 0, startsOn: null, targetChanges: [],
      checkIns: [
        { date: thisWeekStart, isRest: true },
        { date: new Date(thisWeekStart.getTime() + 86400000), isRest: true },
        { date: new Date(thisWeekStart.getTime() + 172800000), isRest: true },
      ],
      bossBattles: [],
    }] as any)

    render(await Page())

    expect(screen.getByTestId('battle-locked')).toBeInTheDocument()
  })

  it('keeps a beaten boss on screen even if the tally now reads lower', async () => {
    // The safety net for tightening the count: a victory already won must not
    // disappear behind "hit your target to unlock".
    const trainingDay = getTrainingDay(new Date())
    const thisWeekStart = getWeekStart(trainingDay)
    vi.mocked(db.lane.findMany).mockResolvedValueOnce([{
      id: 'l1', name: 'Wall ball', emoji: '🥍', targetPerWeek: 5,
      isActive: true, sortOrder: 0, startsOn: null, targetChanges: [],
      checkIns: [{ date: thisWeekStart, isRest: true }],
      bossBattles: [{
        weekStarting: thisWeekStart, challenge: 'burpees', rerollCount: 0,
        completedAt: new Date(), coachNote: 'Well won.',
      }],
    }] as any)

    render(await Page())

    expect(screen.queryByTestId('battle-locked')).not.toBeInTheDocument()
    expect(screen.getByTestId('boss-defeated')).toBeInTheDocument()
  })
})
