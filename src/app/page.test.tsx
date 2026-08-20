import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { LANES_REQUIRED } from '@/lib/season'
import { prisma } from '@/lib/db'

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
  },
}))

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
    // Default mock for lanes to prevent crashes in the loop
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])
    vi.mocked(prisma.lane.count).mockResolvedValue(0)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
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
