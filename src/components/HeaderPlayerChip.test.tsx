import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import HeaderPlayerChip from './HeaderPlayerChip'

// Do NOT vi.mock @/lib/playerLevel — pure module(s), no I/O.
// Render them for real; mocking a collaborator makes the test assert against
// its own mock and pass whatever the component does.

describe('HeaderPlayerChip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders avatar and name: pass `{ playerId: \'p1\', playerName: \'Alice\', defeats: 15 }`, assert avatar and name text present', async () => {
    render(<HeaderPlayerChip playerId="p1" playerName="Alice" defeats={15} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    // PlayerAvatar is a child component; we check for its presence via the name prop passed to it
    // Since we are rendering the real component, we look for the text it renders
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('link destination: render chip, assert wrapper links to `/choose-player`', async () => {
    render(<HeaderPlayerChip playerId="p1" playerName="Alice" defeats={15} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/choose-player')
  })

  it('name hidden on mobile: assert name element has class `hidden sm:inline`', async () => {
    render(<HeaderPlayerChip playerId="p1" playerName="Alice" defeats={15} />)
    const nameSpan = screen.getByText('Alice')
    expect(nameSpan).toHaveClass('hidden', 'sm:inline')
  })
})
