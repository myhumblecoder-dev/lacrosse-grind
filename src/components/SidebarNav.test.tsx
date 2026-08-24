import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SidebarNav from './SidebarNav'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

// The button posts to a server action; under vitest it is just the function
// the form is wired to, which is what these tests check.
vi.mock('@/app/actions/signOutAction', () => ({ signOutAction: vi.fn() }))

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePathname).mockReturnValue('/')
  })

  it('renders five nav links', async () => {
    render(<SidebarNav />)
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lanes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Battles' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Prize' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reflect' })).not.toBeInTheDocument()
  })

  it('toggle collapses labels', async () => {
    const user = import('@testing-library/user-event').then(m => m.default.setup())
    render(<SidebarNav />)
    
    const toggle = screen.getByRole('button', { name: 'Collapse menu' })
    const userInstance = await user
    
    await userInstance.click(toggle)
    
    // When collapsed, the span has sr-only, so the link's accessible name 
    // is just the icon, but the title attribute still exists.
    const link = screen.getByRole('link', { name: /today/i })
    expect(link).toHaveAttribute('title', 'Today')
    
    // Check that the label text is hidden from screen readers via sr-only
    const labelSpan = screen.getByText('Today')
    expect(labelSpan).toHaveClass('sr-only')
    
    // Check toggle state updated
    expect(screen.getByRole('button', { name: 'Expand menu' })).toBeInTheDocument()
  })

  it('active link marked current', async () => {
    vi.mocked(usePathname).mockReturnValue('/lanes')
    render(<SidebarNav />)
    
    const activeLink = screen.getByRole('link', { name: 'Lanes' })
    const inactiveLink = screen.getByRole('link', { name: 'Today' })
    
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    expect(activeLink).toHaveClass('bg-zinc-800', 'text-zinc-100')
    
    expect(inactiveLink).not.toHaveAttribute('aria-current')
    expect(inactiveLink).toHaveClass('text-zinc-400')
  })

  it('renders the prize nav link', async () => {
    render(<SidebarNav />)
    const prizeLink = screen.getByRole('link', { name: 'Prize' })
    expect(prizeLink).toBeInTheDocument()
    expect(prizeLink).toHaveAttribute('href', '/prize')
  })
})

describe('SidebarNav — signing out', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePathname).mockReturnValue('/')
  })

  it('offers a way out, which the app previously had none of', async () => {
    render(<SidebarNav />)

    expect(screen.getByTestId('sign-out')).toHaveTextContent('Sign out')
  })

  it('submits to the sign-out action rather than a dead click', async () => {
    // The action existed and was tested all along; nothing ever called it.
    render(<SidebarNav />)

    const form = screen.getByTestId('sign-out').closest('form')
    expect(form).not.toBeNull()
    expect(form).toHaveAttribute('action')
  })

  it('keeps the label readable to screen readers when collapsed', async () => {
    const user = userEvent.setup()
    render(<SidebarNav />)

    await user.click(screen.getByRole('button', { name: 'Collapse menu' }))

    expect(screen.getByTestId('sign-out')).toHaveTextContent('Sign out')
    expect(screen.getByTestId('sign-out')).toHaveAttribute('title', 'Sign out')
  })

  it('offers nothing to sign out of on the sign-in page', async () => {
    // The shell wraps every route, so the sidebar renders there too.
    vi.mocked(usePathname).mockReturnValue('/signin')

    render(<SidebarNav />)

    expect(screen.queryByTestId('sign-out')).not.toBeInTheDocument()
  })
})
