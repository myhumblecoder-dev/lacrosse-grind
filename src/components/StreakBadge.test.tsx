import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StreakBadge } from './StreakBadge'

describe('StreakBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('streak greater than zero shows flame and count', async () => {
    render(<StreakBadge streak={5} />)
    expect(screen.getByText('🔥')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('streak zero shows start text', async () => {
    render(<StreakBadge streak={0} />)
    expect(screen.getByText('Start your streak')).toBeInTheDocument()
  })
})
