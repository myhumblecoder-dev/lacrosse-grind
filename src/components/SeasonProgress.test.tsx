import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SeasonProgress from './SeasonProgress'

vi.mock('@/lib/seasonProgress', () => ({
  SeasonProgress: vi.fn(),
}))

describe('SeasonProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one season-week cell per entry in progress.weeks', async () => {
    const progress = {
      weeks: [
        { weekStart: new Date('2024-01-01'), status: 'qualified' as const },
        { weekStart: new Date('2024-01-08'), status: 'missed' as const },
        { weekStart: new Date('2024-01-15'), status: 'current' as const },
        { weekStart: new Date('2024-01-22'), status: 'upcoming' as const },
      ],
      qualified: 1,
      earned: false,
      missed: 1,
      missedAllowed: 2,
      missesRemaining: 2,
    }

    render(<SeasonProgress progress={progress} />)

    const cells = screen.getAllByTestId('season-week')
    expect(cells).toHaveLength(4)
  })

  it('the summary shows the qualified count out of 11 qualifying weeks', async () => {
    const progress = {
      weeks: [
        { weekStart: new Date('2024-01-01'), status: 'qualified' as const },
      ],
      qualified: 7,
      earned: false,
      missed: 1,
      missedAllowed: 2,
      missesRemaining: 2,
    }

    render(<SeasonProgress progress={progress} />)

    const summary = screen.getByTestId('season-summary')
    expect(summary).toHaveTextContent('7 of 11 qualifying weeks')
  })

  it('earned progress renders the earned banner and no misses element', async () => {
    const progress = {
      weeks: [
        { weekStart: new Date('2024-01-01'), status: 'qualified' as const },
      ],
      qualified: 11,
      earned: true,
      missed: 0,
      missedAllowed: 2,
      missesRemaining: 0,
    }

    render(<SeasonProgress progress={progress} />)

    expect(screen.getByTestId('season-earned')).toHaveTextContent('Prize earned')
    expect(screen.queryByTestId('season-misses')).toBeNull()
  })
})
