import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { prisma as db } from '@/lib/db'

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

// next/font's loader only exists inside the Next build; under vitest
// `Geist(...)` is not a function and the suite dies at module load.
vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Persistent default: any call not overridden by a test's Once
    // (i.e. the second, inactive-lanes call) resolves empty. A Once here
    // would be consumed FIFO by the FIRST (active) call instead.
    vi.mocked(db.lane.findMany).mockResolvedValue([])
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

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Boss Battles — week of/)
  })
})