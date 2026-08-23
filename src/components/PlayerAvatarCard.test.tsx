import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlayerAvatarCard from './PlayerAvatarCard'

vi.mock('@/components/PlayerAvatar', () => ({
  default: vi.fn(({ level, name }) => <div data-testid="mock-avatar">{name} ({level})</div>)
}))

// Do NOT vi.mock @/lib/playerLevel — pure module(s), no I/O.
// Render them for real; mocking a collaborator makes the test assert against
// its own mock and pass whatever the component does.

describe('PlayerAvatarCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the knight band renders name, level, and distance to next', async () => {
    render(<PlayerAvatarCard defeats={8} />)
    
    const levelName = screen.getByTestId('avatar-level-name')
    expect(levelName).toHaveTextContent(/Knight · Level 5/)
    
    expect(screen.queryByText(/defeats/)).not.toBeInTheDocument()
  })

  it('the cap renders a full bar', async () => {
    render(<PlayerAvatarCard defeats={99999} />)
    
    const bar = screen.getByTestId('avatar-progress-bar')
    expect(bar).toHaveStyle({ width: '100%' })
  })

  it('level zero renders the baby stage', async () => {
    render(<PlayerAvatarCard defeats={0} />)
    
    expect(screen.getByTestId('avatar-level-name')).toHaveTextContent(/Level 0/)
    // The zero state stays quiet — no defeat arithmetic until the first win.
    expect(screen.queryByText(/0 defeats/)).not.toBeInTheDocument()
    expect(screen.queryByText(/to next/)).not.toBeInTheDocument()
  })
})
