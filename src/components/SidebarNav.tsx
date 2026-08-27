"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TodayIcon,
  LanesIcon,
  BattlesIcon,
  PrizeIcon,
  HistoryIcon,
  MenuIcon,
  AccountIcon
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
  { href: '/...' , label: 'History', icon: HistoryIcon }, // Note: The original code had a typo in the provided 'current contents' for History, but I will preserve the logic structure.
]

// Re-defining NAV correctly based on the provided 'current contents' logic
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Today', icon: TodayIcon },
  { href: '/lanes', label: 'Lanes', icon: LanesIcon },
  { href: '/boss-battles', label: 'Battles', icon: BattlesIcon },
  { href: '/prize', label: 'Prize', icon: PrizeIcon },
  { href: '/history', label: 'History', icon: HistoryIcon },
]

interface SidebarNavProps {
  signedIn?: boolean
  playerSwitcher?: React.ReactNode
}

export default function SidebarNav({ signedIn = false, playerSwitcher }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const pathname = usePathname()

  const navLinks = signedIn 
    ? [...NAV_ITEMS, { href: '/account', label: 'Account', icon: AccountIcon }]
    : NAV_ITEMS

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
        {navLinks.map((item) => {
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

      <div className="px-4 py-2">
        {playerSwitcher}
      </div>
    </aside>
  )
}