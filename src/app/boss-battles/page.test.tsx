import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { prisma as db } from '@/lib/db'
import { getLastCompletedWeekStart, getWeekStart, formatWeekLabel } from '@/lib/weekUtils'
import { getTrainingDay } from '@/lib/trainingDay'
import { requireUserId } from '@/lib/tenancy'

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
    },
  },
}))

vi.mock('@/lib/tenancy', () => ({ 
  requireUserId: vi.fn() 
}))

// next/font's loader only exists inside the Next build; under vitest
// `Geist(...)` is not a function and the suite dies at module load.
vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    // Persistent default: any call not overridden by a test's Once
    // (i.e. the second, inactive-lanes call) resolves empty. A Once here
    // would be consumed FIFO by the FIRST (active) call instead.
    vi.mocked(db.lane.findMany).mockResolvedValue([])
  })

  it('both lane queries are scoped to the signed-in user', async () => {
    const userId = 'u1'
    vi.mocked(requireUserId).mockResolvedValue(userId)

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
    // the lane appears twice: its current-week card AND the grace section
    expect(screen.getAllByText(/💪 Strength/)).toHaveLength(2)
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
      bossBattles: [{ weekStarting: lastWeekStart, selfReport: 'Done', coachNote: 'Good' }],
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

    expect(screen.getByText((_, el) => el?.textContent === '5 / 5 days')).toBeInTheDocument()
    expect(screen.getByText('✅ Target hit')).toBeInTheDocument()
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
})
