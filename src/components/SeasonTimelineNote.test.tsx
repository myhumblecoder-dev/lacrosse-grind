import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SeasonTimelineNote from './SeasonTimelineNote'

const FRIDAY = new Date('2026-08-14T21:30:00.000Z')
const MONDAY_START = new Date('2026-08-17T00:00:00.000Z')

describe('SeasonTimelineNote', () => {
  it('tells Eddie when his season would start, before he commits', () => {
    render(<SeasonTimelineNote seasonStart={null} today={FRIDAY} />)

    expect(screen.getByTestId('season-timeline')).toHaveTextContent(
      /starts Mon 17 Aug 2026/i
    )
    expect(screen.getByTestId('season-timeline')).toHaveTextContent(/13 weeks/i)
  })

  it('explains the wait after he presses start on a Friday', () => {
    // The whole point: the button went red but nothing else changed.
    render(<SeasonTimelineNote seasonStart={MONDAY_START} today={FRIDAY} />)

    const note = screen.getByTestId('season-timeline')
    expect(note).toHaveTextContent(/locked in/i)
    expect(note).toHaveTextContent(/Mon 17 Aug 2026/)
    expect(note).toHaveTextContent(/check-ins before then build your streak/i)
  })

  it('counts the week once the season is running', () => {
    render(
      <SeasonTimelineNote
        seasonStart={MONDAY_START}
        today={new Date('2026-08-31T12:00:00.000Z')}
      />
    )

    expect(screen.getByTestId('season-timeline')).toHaveTextContent(/Week 3 of 13/i)
  })

  it('says so when the season is over', () => {
    render(
      <SeasonTimelineNote
        seasonStart={MONDAY_START}
        today={new Date('2026-11-17T00:00:00.000Z')}
      />
    )

    expect(screen.getByTestId('season-timeline')).toHaveTextContent(/season is over/i)
  })
})
