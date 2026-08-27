"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SidebarNav from '@/components/SidebarNav'

interface AppShellProps {
  children: React.ReactNode
  /** Sign in / sign out, resolved on the server and rendered top right. */
  account?: React.ReactNode
  /** Whether there is an account to manage — the nav hides what there is not. */
  signedIn?: boolean
  /** Active-player switcher (epic 6) — sits left of the account control. */
  playerSwitcher?: React.ReactNode
}

export default function AppShell({ children, account, signedIn = false, playerSwitcher }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  
  const [lastPathname, setLastPathname] = useState(pathname)

  // Close drawer when pathname changes during render to avoid useEffect lint error
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setIsOpen(false)
  }

  const toggleDrawer = () => setIsOpen((prev) => !prev)
  const closeDrawer = () => setIsOpen(false)

  return (
    // Column on mobile so the top bar sits above the content; ROW from `md`
    // up, where the drawer goes `md:static` and rejoins the flow — in a column
    // it would stack above the content as a full-width band instead of sitting
    // beside it, which is the layout this app had before.
    <div className="relative flex min-h-screen flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          data-testid="nav-backdrop"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      {/* No width or background here on purpose: SidebarNav owns both
          (w-56 / w-16 and bg-zinc-900). Setting w-64 and bg-white left a pale
          strip beside the nav and clashed with the dark theme. */}
      <aside
        data-testid="nav-drawer"
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarNav signedIn={signedIn} playerSwitcher={playerSwitcher} />
      </aside>

      {/* min-w-0 keeps a wide child (the history heatmap, a long coach note)
          from stretching the row and pushing content off a phone screen. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The header is no longer mobile-only — the account control needs
            somewhere to live at every width, and the top right is where people
            look for it. Inside the content column rather than overlaying it,
            so a long page never slides under the sign-out button. The
            hamburger and the title stay mobile-only. */}
        <header
          data-testid="mobile-topbar"
          className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 md:justify-end md:border-b-0 md:bg-transparent md:p-3"
        >
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={toggleDrawer}
              aria-label="Open menu"
              aria-expanded={isOpen}
              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <span className="sr-only">Menu</span>
              {/* Simple hamburger icon */}
              <div className="space-y-1">
                <div className="h-0.5 w-6 bg-current" />
                <div className="h-0.5 w-6 bg-current" />
                <div className="h-0.5 w-6 bg-current" />
              </div>
            </button>
            <span className="text-lg font-bold text-zinc-100">Lacrosse Grind</span>
          </div>
          <div className="flex items-center gap-2">{playerSwitcher}{account}</div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>

        {/* Reachable from anywhere, including the demo — someone deciding
            whether to trust this with a child's record should not have to
            sign in to read how it is handled. */}
        <footer className="border-t border-zinc-800/60 px-6 py-4 text-xs text-zinc-600">
          <Link href="/about" className="hover:text-zinc-300">
            About
          </Link>
          <span className="px-2">·</span>
          <Link href="/privacy" className="hover:text-zinc-300">
            Privacy
          </Link>
          <span className="px-2">·</span>
          <Link href="/terms" className="hover:text-zinc-300">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  )
}