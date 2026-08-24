import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { getViewer } from '@/lib/viewer'
import { prisma } from '@/lib/db'

// next/font's loader only exists inside the Next build; under vitest
// `Geist(...)` is not a function and the suite dies at module load.
vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))

vi.mock('@/lib/viewer', () => ({ getViewer: vi.fn() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    bossBattle: {
      count: vi.fn(),
    },
    prize: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.lane.count).mockResolvedValue(3)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1' })
  })

  it('the lane list is scoped to the signed-in user', async () => {
    const mockLanes = [
      { id: 'l1', name: 'Running', emoji: '🏃', isActive: true, sortOrder: 1, targetPerWeek: 3, userId: 'u1' },
      { id: 'l2', name: 'Reading', emoji: '📚', isActive: false, sortOrder: 2, targetPerWeek: 5, userId: 'u1' },
    ]

    vi.mocked(prisma.lane.findMany).mockResolvedValue(mockLanes as any)

    // We render the component. Since it's an async Server Component, 
    // we await the component function call directly.
    const ResolvedPage = await Page()
    render(ResolvedPage)

    expect(getViewer).toHaveBeenCalled()
    expect(prisma.lane.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      include: { targetChanges: true },
    })

    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()
  })
})