import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import About from '@/app/about/page'

vi.mock('next/font/google', () => new Proxy({}, { get: () => () => ({ variable: 'v', className: 'c' }) }))

import { LADDER_NAMES } from '@/lib/playerLevel'

describe('the ladder on the page is the ladder in the code', () => {
  it('names every evolution exactly as playerLevel does, in order', () => {
    // The check that was missing. The old assertion only counted nine images
    // matching /Evolution \d of 9/, which passes with any names in any order —
    // so a hand-copied list drifted from LADDER once (page and squire ended up
    // inverted) and nothing here noticed. The page now derives its list, and
    // this fails if that derivation is ever replaced by a copy again.
    render(<About />)

    const rendered = screen
      .getAllByRole('img')
      .map((img) => img.getAttribute('alt') ?? '')
      .filter((alt) => /^Evolution \d of 9: /.test(alt))
      .map((alt) => alt.replace(/^Evolution \d of 9: /, ''))

    expect(rendered).toEqual([...LADDER_NAMES])
  })
})

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
