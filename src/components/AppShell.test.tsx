import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AppShell from './AppShell'

// Mock next/navigation exactly as SidebarNav.test.tsx does
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

// Mock SidebarNav to avoid deep rendering issues
vi.mock('@/components/SidebarNav', () => ({
  default: () => <div data-testid="sidebar-nav">Sidebar Nav Content</div>,
}))

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders its children', async () => {
    render(
      <AppShell>
        <div data-testid="child-content">Hello World</div>
      </AppShell>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('the drawer carries the closed class until the menu button is clicked', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    const drawer = screen.getByTestId('nav-drawer')
    expect(drawer).toHaveClass('-translate-x-full')

    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(menuButton)

    expect(drawer).toHaveClass('translate-x-0')
  })

  it('clicking the backdrop closes the drawer', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(menuButton)

    // Verify backdrop exists when open
    const backdrop = screen.getByTestId('nav-backdrop')
    expect(backdrop).toBeInTheDocument()

    // Click backdrop to close
    await user.click(backdrop)

    // Verify backdrop is removed from DOM
    expect(screen.queryByTestId('nav-backdrop')).toBeNull()
    // Verify drawer is closed
    expect(screen.getByTestId('nav-drawer')).toHaveClass('-translate-x-full')
  })
  // Regression guard. The first landed version wrapped everything in a plain
  // `flex-col`, so at `md` the drawer went `md:static` and rejoined the flow as
  // a COLUMN item — stacking the nav above the content as a full-width band
  // instead of beside it. Every unit test still passed, because jsdom applies
  // no CSS. Assert the row explicitly.
  it('lays out as a row from md up so the desktop rail sits beside the content', async () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('flex-col')
    expect(wrapper.className).toContain('md:flex-row')
  })
})
