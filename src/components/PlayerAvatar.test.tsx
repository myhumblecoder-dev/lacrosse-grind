import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlayerAvatar from './PlayerAvatar'

describe('PlayerAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('default size unchanged: render with only `level` and `name`, assert the img has width 192 and height 192', async () => {
    render(<PlayerAvatar level={5} name="Hero" />)
    const img = screen.getByRole('img')
    expect(img.style.width).toBe('192px')
    expect(img.style.height).toBe('192px')
    expect(img).toHaveAttribute('width', '192')
    expect(img).toHaveAttribute('height', '192')
  })

  it('custom size: render with `size={32}`, assert the img has width 32 and height 32', async () => {
    render(<PlayerAvatar level={5} name="Hero" size={32} />)
    const img = screen.getByRole('img')
    expect(img.style.width).toBe('32px')
    expect(img.style.height).toBe('32px')
    expect(img).toHaveAttribute('width', '32')
    expect(img).toHaveAttribute('height', '32')
  })

  it('fallback respects size: force the error fallback, assert the fallback div style has width 32 when `size={32}`', async () => {
    render(<PlayerAvatar level={5} name="Hero" size={32} />)
    const img = screen.getByRole('img')
    
    img.dispatchEvent(new Event('error', { bubbles: true }))

    const fallback = await screen.findByTestId('avatar-fallback')
    expect(fallback.style.width).toBe('32px')
    expect(fallback.style.height).toBe('32px')
  })
})
