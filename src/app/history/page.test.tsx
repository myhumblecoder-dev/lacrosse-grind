import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-int' }),
}))

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('a retired lane with history renders muted with the tag', async () => {
    const { prisma } = await import('@/lib/db')
    const today = new Date()
    const lanes = [
      {
        id: '1',
        name: 'Active Lane',
        emoji: '🚀',
        isActive: true,
        sortOrder: 1,
        checkIns: [{ date: today, isRest: false } as any],
      },
      {
        id: '2',
        name: 'Retired Lane',
        emoji: '💀',
        isActive: false,
        sortOrder: 2,
        checkIns: [{ date: today, isRest: false } as any],
      },
    ] as any
    vi.mocked(prisma.lane.findMany).mockResolvedValue(lanes)

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.getByText(/Active Lane/)).toBeInTheDocument()
    expect(screen.getByText(/Retired Lane/)).toBeInTheDocument()
    expect(screen.getByTestId('retired-tag')).toHaveTextContent('retired')
  })

  it('active lanes carry no tag', async () => {
    const { prisma } = await import('@/lib/db')
    const lanes = [
      {
        id: '1',
        name: 'Active Lane',
        emoji: '🚀',
        isActive: true,
        sortOrder: 1,
        checkIns: [{ date: new Date(), isRest: false } as any],
      },
    ] as any
    vi.mocked(prisma.lane.findMany).mockResolvedValue(lanes)

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByTestId('retired-tag')).toBeNull()
  })

  it('an empty retired lane is skipped', async () => {
    const { prisma } = await import('@/lib/db')
    const lanes = [
      {
        id: '1',
        name: 'Active Lane',
        emoji: '🚀',
        isActive: true,
        sortOrder: 1,
        checkIns: [{ date: new Date(), isRest: false } as any],
      },
      {
        id: '2',
        name: 'Empty Retired Lane',
        emoji: '💀',
        isActive: false,
        sortOrder: 2,
        checkIns: [],
      },
    ] as any
    vi.mocked(prisma.lane.findMany).mockResolvedValue(lanes)

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByText(/Empty Retired Lane/)).not.toBeInTheDocument()
  })
})
