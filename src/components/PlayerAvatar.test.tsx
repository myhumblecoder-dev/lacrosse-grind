import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlayerAvatar from './PlayerAvatar'

describe('PlayerAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the image points at the level\'s file with pixelated rendering', async () => {
    render(<PlayerAvatar level={5} name="Hero" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/avatars/level-5.png')
    expect(img).toHaveAttribute('alt', 'Hero')
    expect(img).toHaveClass('[image-rendering:pixelated]')
  })

  it('a failed image load shows the named fallback', async () => {
    render(<PlayerAvatar level={3} name="Knight" />)
    const img = screen.getByRole('img')
    
    // Simulate error
    img.dispatchEvent(new Event('error', { bubbles: true }))

    const fallback = await screen.findByTestId('avatar-fallback')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveTextContent('Knight 🛡️')
  })

  it('the wrapper carries the level for styling hooks', async () => {
    render(<PlayerAvatar level={8} name="Warrior" />)
    const wrapper = screen.getByTestId('player-avatar')
    expect(wrapper).toHaveAttribute('data-level', '8')
  })
})