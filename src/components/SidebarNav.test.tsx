import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SidebarNav from './SidebarNav'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePathname).mockReturnValue('/')
  })

  it('playerSwitcher node appears in nav when provided', async () => {
    const switcher = <span data-testid="nav-switcher">NS</span>
    render(<SidebarNav playerSwitcher={switcher} />)
    expect(screen.getByTestId('nav-switcher')).toBeInTheDocument()
  })

  it('nav renders without error when playerSwitcher is undefined', async () => {
    render(<SidebarNav />)
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument()
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
