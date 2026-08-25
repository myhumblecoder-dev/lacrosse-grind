import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlayerAvatarCard from './PlayerAvatarCard'

vi.mock('@/components/PlayerAvatar', () => ({
  default: vi.fn(({ level, name }) => <div data-testid="mock-avatar">{name} ({level})</div>)
}))

// Do NOT vi.mock @/lib/playerLevel — pure module(s), no I/O.
// Render them for real; mocking a collaborator makes the test assert against
// its own mock and pass whatever the component does.

const earned = () => screen.queryAllByTestId('pip-earned').length
const locked = () => screen.queryAllByTestId('pip-locked').length

describe('PlayerAvatarCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the barbarian band renders name and level', async () => {
    render(<PlayerAvatarCard defeats={8} />)

    const levelName = screen.getByTestId('avatar-level-name')
    expect(levelName).toHaveTextContent(/Barbarian · Level 5/)

    expect(screen.queryByText(/defeats/)).not.toBeInTheDocument()
  })

  it('the cap lights every evolution', async () => {
    render(<PlayerAvatarCard defeats={99999} />)

    // Pinned to nine on purpose: it is a product fact the art assets and the
    // landing page both commit to, so adding a rank should break this test.
    expect(earned()).toBe(9)
    expect(locked()).toBe(0)
  })

  it('level zero renders the hatchling stage', async () => {
    render(<PlayerAvatarCard defeats={0} />)

    expect(screen.getByTestId('avatar-level-name')).toHaveTextContent(/Level 0/)
    // The zero state stays quiet — no defeat arithmetic until the first win.
    expect(screen.queryByText(/0 defeats/)).not.toBeInTheDocument()
    expect(screen.queryByText(/to next/)).not.toBeInTheDocument()
  })

  it('shows something from the very first rank', async () => {
    // The whole point of the change: a bar measuring distance-to-next-rank sat
    // at zero for hatchling, whelp and shieldbearer, because those bands are one boss
    // wide. A pip is lit at every rank, including the very first.
    render(<PlayerAvatarCard defeats={0} />)

    expect(earned()).toBe(1)
  })

  it('lights one more pip at each evolution', async () => {
    for (const [defeats, expected] of [[0, 1], [1, 2], [2, 3], [3, 4], [5, 5], [8, 6], [13, 7], [21, 8], [34, 9]] as const) {
      const { unmount } = render(<PlayerAvatarCard defeats={defeats} />)
      expect(earned(), `defeats=${defeats}`).toBe(expected)
      unmount()
    }
  })

  it('does not light a pip part-way through a band', async () => {
    // 4 defeats is still raider — the rank has not changed, so nor has the row.
    render(<PlayerAvatarCard defeats={4} />)
    expect(earned()).toBe(4)
  })

  it('always draws the full ladder, lit or not', async () => {
    const { unmount } = render(<PlayerAvatarCard defeats={0} />)
    const total = earned() + locked()
    unmount()

    render(<PlayerAvatarCard defeats={13} />)
    expect(earned() + locked()).toBe(total)
  })

  it('names the evolution reached for screen readers', async () => {
    render(<PlayerAvatarCard defeats={8} />)

    expect(screen.getByTestId('avatar-pips')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Evolution 6 of 9: barbarian')
    )
  })
})
