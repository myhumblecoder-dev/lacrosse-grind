import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeeklyProgress } from './WeeklyProgress'

describe('WeeklyProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hit and target label', async () => {
    render(<WeeklyProgress hits={3} target={7} />)
    expect(screen.getByText('3 / 7 days this week')).toBeInTheDocument()
  })

  it('progress bar width at half target', async () => {
    render(<WeeklyProgress hits={5} target={10} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveStyle({ width: '50%' })
  })

  it('green class when hits meet target', async () => {
    render(<WeeklyProgress hits={7} target={7} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveClass('bg-green-500')
  })
})
