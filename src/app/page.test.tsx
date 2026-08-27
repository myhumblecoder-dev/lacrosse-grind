import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Page from './page'
import { LANES_REQUIRED } from '@/lib/season'
import { prisma } from '@/lib/db'
import { getViewer } from '@/lib/viewer'

// Mocking the components as requested by the AC
vi.mock('@/components/SeasonStartButton', () => ({
  default: ({ hasStarted, isReady }: { hasStarted: boolean; isReady: boolean }) => (
    <div data-testid="season-start-button" data-has-started={String(hasStarted)} data-is-ready={String(isReady)}>
      Season Start Button
    </div>
  ),
}))

vi.mock('@/components/SeasonResetButton', () => ({
  default: () => <div data-testid="season-reset-open" />,
}))
vi.mock('@/components/SeasonSetupPanel', () => ({
  default: ({ laneCount, lanesNeeded, hasPrize }: any) => (
    <div data-testid="season-setup-panel" data-lane-count={String(laneCount)} data-lanes-needed={String(lanesNeeded)} data-has-prize={String(hasPrize)}>
      Season Setup Panel
    </div>
  ),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    prize: {
      findUnique: vi.fn(),
    },
    bossBattle: {
      count: vi.fn(),
    },
    streakFreeze: {
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/viewer', () => ({ getViewer: vi.fn() }))

// Mocking next/font/google's loader only exists inside the Next build; under vitest
// `Geist(...)` is not a function and the suite dies at module load.
vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))

// Do NOT vi.mock @/lib/seasonReadiness — pure module(s), no I/O.
// Render them for real; mocking a collaborator makes the test assert against
// its own mock and pass whatever the component does.

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    // Default mock for lanes to prevent crashes in the loop
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])
    vi.mocked(prisma.lane.count).mockResolvedValue(0)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(prisma.streakFreeze.groupBy).mockResolvedValue([] as never)
  })

  it('every query is scoped to the signed-in user', async () => {
    const userId = 'u1'
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId, playerId: 'p1' })
    
    // Setup mocks to verify the 'where' clause
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.lane.count).mockResolvedValue(0)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    await Page()

    expect(prisma.prize.findUnique).toHaveBeenCalledWith({
      where: { playerId: 'p1' }
    })
    expect(prisma.lane.count).toHaveBeenCalledWith({
      where: { isActive: true, playerId: 'p1' }
    })
    expect(prisma.lane.findMany).toHaveBeenCalledWith({
      where: { isActive: true, playerId: 'p1' },
      orderBy: { sortOrder: "asc" },
      include: expect.anything()
    })
  })

  it('a not-ready season renders the setup panel', async () => {
    // Setup: No prize, 0 active lanes (not ready)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.lane.count).mockResolvedValue(0)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    // We must render the component. Since it's an async Server Component,
    // we await the component call directly in the test.
    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.getByTestId('season-setup-panel')).toBeInTheDocument()
    expect(screen.getByTestId('season-start-button')).toBeInTheDocument()
  })

  it('a started season renders no setup panel', async () => {
    // Setup: Prize exists with seasonStart date (season has started)
    const mockPrize = {
      id: 'prize',
      title: 'The Grand Prize',
      seasonStart: new Date(),
      reasons: [],
    }
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(mockPrize as any)
    vi.mocked(prisma.lane.count).mockResolvedValue(5)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByTestId('season-setup-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('season-start-button')).toBeInTheDocument()
  })

  it('tells the setup panel how many lanes the season actually requires', async () => {
    // The panel computes `laneCount >= lanesNeeded` to tick its step off. When
    // the page hands it 0, that comparison is always true, so Eddie is told
    // his setup is complete while the START button stays disabled.
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      id: 'prize',
      title: 'PS5',
      seasonStart: null,
      reasons: [],
    } as any)
    vi.mocked(prisma.lane.count).mockResolvedValue(1)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    render(await Page())

    const panel = screen.getByTestId('season-setup-panel')
    expect(panel.getAttribute('data-lanes-needed')).toBe(String(LANES_REQUIRED))
  })

  it('reset lives at the bottom once started', async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      id: 'prize',
      seasonStart: new Date(),
    } as never)

    const { container } = render(await Page())

    const main = container.querySelector('main')
    const reset = screen.getByTestId('season-reset-open')
    expect(main?.lastElementChild).toBe(reset)
  })

  it('no reset before the season starts', async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      id: 'prize',
      seasonStart: null,
    } as never)

    render(await Page())

    expect(screen.queryByTestId('season-reset-open')).toBeNull()
  })
})

describe('Page — the freeze offer', () => {
  const day = (iso: string) => new Date(iso + 'T00:00:00.000Z')

  // Today is Sunday 23 Aug 2026, the day from Eddie's report.
  const TODAY = '2026-08-23'

  const laneWith = (
    checkIns: { date: Date; isRest: boolean }[],
    streakFreezes: { usedDate: Date | null }[]
  ) => [{
    id: 'l1',
    name: '50yrd suicide 3 times',
    emoji: '🏃',
    targetPerWeek: 3,
    isActive: true,
    sortOrder: 0,
    startsOn: null,
    targetChanges: [],
    checkIns,
    streakFreezes,
  }]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TODAY + 'T18:00:00.000Z'))
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
  })

  afterEach(() => vi.useRealTimers())

  it('offers a banked freeze for the day that broke the run', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith(
        [
          { date: day('2026-08-23'), isRest: false }, // today
          // 22 Aug missed
          { date: day('2026-08-21'), isRest: false },
          { date: day('2026-08-20'), isRest: false },
        ],
        [{ usedDate: null }]
      ) as never
    )

    render(await Page())

    expect(screen.getByTestId('freeze-offer')).toHaveTextContent(
      /You missed Sat 22 Aug 2026/
    )
    // 23rd + frozen 22nd + 21st + 20th
    expect(screen.getByTestId('freeze-offer')).toHaveTextContent(
      /take your streak to 4/
    )
  })

  it('offers nothing when there is no token banked', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith(
        [
          { date: day('2026-08-23'), isRest: false },
          { date: day('2026-08-21'), isRest: false },
          { date: day('2026-08-20'), isRest: false },
        ],
        []
      ) as never
    )

    render(await Page())

    expect(screen.queryByTestId('freeze-offer')).not.toBeInTheDocument()
  })

  it('offers nothing while today has no check-in', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith(
        [
          { date: day('2026-08-21'), isRest: false },
          { date: day('2026-08-20'), isRest: false },
        ],
        [{ usedDate: null }]
      ) as never
    )

    render(await Page())

    expect(screen.queryByTestId('freeze-offer')).not.toBeInTheDocument()
  })

  it('a spent freeze keeps the streak counting across the day it covered', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith(
        [
          { date: day('2026-08-23'), isRest: false },
          { date: day('2026-08-21'), isRest: false },
          { date: day('2026-08-20'), isRest: false },
        ],
        [{ usedDate: day('2026-08-22') }]
      ) as never
    )

    render(await Page())

    // The gap is bridged, so there is nothing left to offer...
    expect(screen.queryByTestId('freeze-offer')).not.toBeInTheDocument()
    // ...and the run reads as unbroken rather than resetting to 1.
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('reaches back beyond this week so a streak is not capped at the Monday', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue(laneWith([], []) as never)

    await Page()

    const include = vi.mocked(prisma.lane.findMany).mock.calls[0][0]!
      .include as { checkIns: { where: { date: { gte: Date } } } }
    const weekStart = day('2026-08-17')
    expect(include.checkIns.where.date.gte.getTime()).toBeLessThan(weekStart.getTime())
  })
})

describe('Page — the bar counts what the season counts', () => {
  const day = (iso: string) => new Date(iso + 'T00:00:00.000Z')
  const TODAY = '2026-08-23' // Sunday, so the whole week is in range

  const laneWith = (checkIns: { date: Date; isRest: boolean }[]) => [{
    id: 'l1', name: 'Wall ball', emoji: '🥍', targetPerWeek: 3,
    isActive: true, sortOrder: 0, startsOn: null, targetChanges: [],
    checkIns, streakFreezes: [],
  }]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TODAY + 'T18:00:00.000Z'))
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
  })

  afterEach(() => vi.useRealTimers())

  it('caps rest days the way the prize grid does', async () => {
    // Three rest days and nothing else. The season counts that as one hit,
    // so a target of three is NOT met — the bar used to read 3 / 3 and call
    // it done while the Prize grid scored the same week as missed.
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith([
        { date: day('2026-08-17'), isRest: true },
        { date: day('2026-08-18'), isRest: true },
        { date: day('2026-08-19'), isRest: true },
      ]) as never
    )

    render(await Page())

    expect(screen.getByText('1 / 3 days this week')).toBeInTheDocument()
  })

  it('still gives a single rest day full credit', async () => {
    // Rest counts — it is only the second one in a week that does not.
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith([
        { date: day('2026-08-17'), isRest: false },
        { date: day('2026-08-18'), isRest: true },
        { date: day('2026-08-19'), isRest: false },
      ]) as never
    )

    render(await Page())

    expect(screen.getByText('3 / 3 days this week')).toBeInTheDocument()
  })

  it('counts only this week, not the streak window behind it', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue(
      laneWith([
        { date: day('2026-08-10'), isRest: false }, // last week
        { date: day('2026-08-11'), isRest: false }, // last week
        { date: day('2026-08-18'), isRest: false },
      ]) as never
    )

    render(await Page())

    expect(screen.getByText('1 / 3 days this week')).toBeInTheDocument()
  })
})
