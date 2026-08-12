import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('PrizePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.lane.findMany).mockResolvedValue([] as never)
  })

  it('titles the first week cell from the stored season start', async () => {
    // Deliberately NOT the SEASON_START constant: if the page still reads the
    // constant, the label is 2026-08-10 and this fails.
    const started = new Date('2026-09-07T00:00:00.000Z')
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      ...PRIZE,
      seasonStart: started,
    } as never)

    render(await PrizePage())

    const cells = screen.getAllByTestId('season-week')
    expect(cells).toHaveLength(SEASON_WEEKS)
    expect(cells[0].getAttribute('title')).toBe(formatWeekLabel(started))
  })

  it('marks every week upcoming before the season starts', async () => {
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      ...PRIZE,
      seasonStart: null,
    } as never)

    render(await PrizePage())

    const cells = screen.getAllByTestId('season-week')
    expect(cells).toHaveLength(SEASON_WEEKS)
    expect(cells.map((c) => c.getAttribute('data-status'))).toEqual(
      Array(SEASON_WEEKS).fill('upcoming')
    )
  })
})
