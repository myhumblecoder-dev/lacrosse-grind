import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AccountControl from './AccountControl'

vi.mock('@/app/actions/promptSignIn', () => ({ promptSignIn: vi.fn() }))
vi.mock('@/app/actions/signOutAction', () => ({ signOutAction: vi.fn() }))

describe('AccountControl', () => {
  it('offers a way in when signed out', () => {
    render(<AccountControl signedIn={false} />)

    expect(screen.getByTestId('header-sign-in')).toHaveAttribute('aria-label', 'Sign in')
    expect(screen.queryByTestId('header-sign-out')).not.toBeInTheDocument()
  })

  it('offers a way out when signed in', () => {
    render(<AccountControl signedIn />)

    expect(screen.getByTestId('header-sign-out')).toHaveAttribute('aria-label', 'Sign out')
    expect(screen.queryByTestId('header-sign-in')).not.toBeInTheDocument()
  })

  it('submits a form rather than relying on a click handler', () => {
    // Works without JavaScript, same as the sign-out it replaces.
    render(<AccountControl signedIn={false} />)

    expect(screen.getByTestId('header-sign-in').closest('form')).toHaveAttribute('action')
  })

  it('keeps the label reachable when the text is hidden on a narrow screen', () => {
    render(<AccountControl signedIn />)

    expect(screen.getByTestId('header-sign-out')).toHaveAttribute('title', 'Sign out')
  })
})
