"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '@/app/actions/signOutAction'
import {
  TodayIcon,
  LanesIcon,
  BattlesIcon,
  PrizeIcon,
  HistoryIcon,
  MenuIcon,
  SignOutIcon
} from '@/components/icons'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const NAV: NavItem[] = [
  { href: '/', label: 'Today', icon: TodayIcon },
  { href: '/lanes', label: 'Lanes', icon: LanesIcon },
  { href: '/boss-battles', label: 'Battles', icon: BattlesIcon },
  { href: '/prize', label: 'Prize', icon: PrizeIcon },
  { href: '/history', label: 'History', icon: HistoryIcon },
]

export default function SidebarNav() {
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const pathname = usePathname()

  return (
    <aside
      className={`flex h-full flex-col transition-all border-r border-zinc-800 bg-zinc-900 ${collapsed ? 'w-16' : 'w-56'}`}
    >
      <div className="p-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
        >
          <MenuIcon />
        </button>
      </div>

      <nav className="mt-2">
        {NAV.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={collapsed ? 'sr-only' : ''}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Not on the sign-in page: the shell wraps every route, so the sidebar
          renders there too, and offering to sign out of nothing is nonsense. */}
      {pathname !== '/signin' && (
        <form action={signOutAction} className="mt-auto border-t border-zinc-800 p-2">
          <button
            type="submit"
            title="Sign out"
            data-testid="sign-out"
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-100"
          >
            <SignOutIcon />
            <span className={collapsed ? 'sr-only' : ''}>Sign out</span>
          </button>
        </form>
      )}
    </aside>
  )
}
