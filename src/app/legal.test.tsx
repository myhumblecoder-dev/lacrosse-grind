import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Privacy from '@/app/privacy/page'
import Terms from '@/app/terms/page'
import { LEGAL } from '@/lib/legal'

vi.mock('next/font/google', () => new Proxy({}, { get: () => () => ({ variable: 'v', className: 'c' }) }))

describe('the legal pages say what the app actually does', () => {
  it('names the operator on both', () => {
    const { unmount } = render(<Privacy />)
    expect(screen.getAllByText(new RegExp(LEGAL.company))[0]).toBeInTheDocument()
    unmount()

    render(<Terms />)
    expect(screen.getAllByText(new RegExp(LEGAL.company))[0]).toBeInTheDocument()
  })

  it('states the limit on what reaches the model', () => {
    // The strongest true claim available, and it is only true because the
    // prompt builders take a lane name, an emoji, a rank and a count.
    render(<Privacy />)

    expect(screen.getByText(/never sent a name, an email address, a photo/i)).toBeInTheDocument()
  })

  it('promises deletion the app can actually perform', () => {
    // deleteAccount removes lanes, their children, the prize, the ledger and
    // the stored photos. The wording must not outrun that.
    render(<Privacy />)

    expect(screen.getByText(/immediately and\s+permanently/i)).toBeInTheDocument()
  })

  it('says accounts belong to an adult, which sign-in also states', () => {
    render(<Terms />)

    expect(screen.getByText(/must be 18 or over/i)).toBeInTheDocument()
  })

  it('warns that a prize photo is readable by anyone with the link', () => {
    // Blobs are uploaded with access: "public" — saying otherwise would be a
    // comfortable lie.
    render(<Privacy />)

    expect(screen.getByText(/unlisted public URL/i)).toBeInTheDocument()
  })

  it('does not claim analytics it does not have, nor deny cookies it does', () => {
    render(<Privacy />)

    expect(screen.getByText(/No analytics, no tracking pixels/i)).toBeInTheDocument()
    expect(screen.getByText(/for keeping you signed in/i)).toBeInTheDocument()
  })

  it('carries a jurisdiction and a contact rather than leaving them blank', () => {
    render(<Terms />)

    expect(LEGAL.jurisdiction.length).toBeGreaterThan(0)
    expect(LEGAL.contactEmail).toMatch(/@/)
  })
})
