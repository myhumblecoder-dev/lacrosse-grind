import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FreezeBadge } from './FreezeBadge'

describe('FreezeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders freeze count when greater than zero', async () => {
    render(<FreezeBadge availableFreezes={3} />)
    expect(screen.getByText('❄️ 3')).toBeInTheDocument()
  })

  it('renders no freezes text when zero', async () => {
    render(<FreezeBadge availableFreezes={0} />)
    expect(screen.getByText('No freezes')).toBeInTheDocument()
    expect(screen.getByText('No freezes')).toHaveClass('text-zinc-500')
  })
})
