import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getViewer } from '@/lib/viewer'

vi.mock('@/lib/viewer', () => ({ getViewer: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    lane: { findMany: vi.fn(), count: vi.fn() },
    prize: { findUnique: vi.fn() },
    bossBattle: { count: vi.fn() },
  },
}))
vi.mock('next/font/google', () => new Proxy({}, { get: () => () => ({ variable: 'v', className: 'c' }) }))

import { prisma } from '@/lib/db'
import Dashboard from '@/app/page'
import Lanes from '@/app/lanes/page'
import Battles from '@/app/boss-battles/page'
import Prize from '@/app/prize/page'
import History from '@/app/history/page'

const PAGES = [
  ['Today', Dashboard],
  ['Lanes', Lanes],
  ['Boss battles', Battles],
  ['Prize', Prize],
  ['History', History],
] as const

describe('every page is browsable signed out', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getViewer).mockResolvedValue({ kind: 'demo' })
  })

  it.each(PAGES)('%s renders a demo without touching the database', async (_name, Page) => {
    render(await Page())

    expect(screen.getByTestId('demo-banner')).toBeInTheDocument()
    // The signed-out path must not query at all — that is what makes the demo
    // read-only by construction rather than by a check somebody could forget.
    expect(prisma.lane.findMany).not.toHaveBeenCalled()
    expect(prisma.prize.findUnique).not.toHaveBeenCalled()
    expect(prisma.bossBattle.count).not.toHaveBeenCalled()
  })
})
