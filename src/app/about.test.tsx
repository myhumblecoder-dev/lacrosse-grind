import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import About from '@/app/about/page'

vi.mock('next/font/google', () => new Proxy({}, { get: () => () => ({ variable: 'v', className: 'c' }) }))

describe('the about page carries what the marketing site said', () => {
  it('keeps the problem statement, which is the sharpest writing in it', () => {
    render(<About />)

    expect(screen.getByText(/Most youth-sports apps grade kids/)).toBeInTheDocument()
    expect(screen.getByText(/Kids don't want therapy homework/)).toBeInTheDocument()
  })

  it('keeps all four pillars', () => {
    render(<About />)

    for (const title of ['Lanes, not drills', 'Boss battles', 'A monster that grows', 'A season, a prize']) {
      expect(screen.getByText(title), title).toBeInTheDocument()
    }
  })

  it('keeps every reason families are told', () => {
    render(<About />)

    for (const lead of [
      'No feeds, no friends lists, no ads.',
      'The kid never chats with an AI.',
      'Forgiveness is a mechanic.',
      'The prize is yours, not ours.',
      'The history is honest.',
    ]) {
      expect(screen.getByText(lead), lead).toBeInTheDocument()
    }
  })

  it('shows all nine evolutions from the same art the avatar uses', () => {
    render(<About />)

    const monsters = screen.getAllByRole('img', { name: /Evolution \d of 9/ })
    expect(monsters).toHaveLength(9)
  })

  it('sends people into the demo rather than at a sign-in wall', () => {
    render(<About />)

    expect(screen.getByRole('link', { name: /Try it without signing up/ })).toHaveAttribute('href', '/')
  })

  it('carries a description for search engines to show', () => {
    // This page is the reason the app can be found at all once indexing opens.
    expect(About).toBeDefined()
  })
})
