"use client"

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import SidebarNav from '@/components/SidebarNav'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
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
    <div className="relative flex min-h-screen flex-col">
      {/* Mobile Top Bar */}
      <header
        data-testid="mobile-topbar"
        className="flex items-center justify-between border-b bg-white p-4 md:hidden"
      >
        <h1 className="text-lg font-bold">App</h1>
        <button
          onClick={toggleDrawer}
          aria-label="Open menu"
          aria-expanded={isOpen}
          className="p-2 text-gray-600"
        >
          <span className="sr-only">Menu</span>
          {/* Simple hamburger icon */}
          <div className="space-y-1">
            <div className="h-0.5 w-6 bg-current" />
            <div className="h-0.5 w-6 bg-current" />
            <div className="h-0.5 w-6 bg-current" />
          </div>
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          data-testid="nav-backdrop"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        data-testid="nav-drawer"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarNav />
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}