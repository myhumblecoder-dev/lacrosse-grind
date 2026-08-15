import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatWeekLabel } from '@/lib/weekUtils'
import { SEASON_WEEKS } from '@/lib/season'
import PrizePage from './page'

vi.mock('@/lib/db', () => ({
  prisma: {
    prize: { findUnique: vi.fn() },
    lane: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db'

const PRIZE = {
  id: 'prize',
  title: 'PS5',
  description: null,
  reasons: [] as string[],
  photoUrl: null,
  seasonStart: null as Date | null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the timeline note renders above the season grid', async () => {
    const started = new Date('2026-09-07T00:00:00.000Z')
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      ...PRIZE,
      seasonStart: started,
    } as never)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([] as never)

    render(await PrizePage())

    const note = screen.getByTestId('season-timeline')
    expect(note).toBeInTheDocument()
    
    const grid = screen.getAllByTestId('season-week')[0]
    expect(note.compareDocumentPosition(grid)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('the note reflects a season that has not started', async () =>
    async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      ...PRIZE,
      seasonStart: null,
    } as never)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([] as never)

    render(await PrizePage())

    const note = screen.getByTestId('season-timeline')
    expect(note).toHaveTextContent(/season has not started/i)
  })
})
