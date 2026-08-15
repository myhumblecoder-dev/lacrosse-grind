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
    // An arbitrary Monday: the grid must follow the stored date, which is
    // now the only source of truth for when the season began.
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

  it('does not exclude retired lanes from the season grid', async () => {
    // The grid answers "what happened this season". A lane Eddie retired
    // still earned its check-ins, so filtering the query by isActive would
    // erase them from weeks he already qualified.
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({
      ...PRIZE,
      seasonStart: new Date('2026-09-07T00:00:00.000Z'),
    } as never)

    render(await PrizePage())

    // `where` may be absent entirely once the filter is gone — both that
    // and a where-clause without isActive are correct.
    const where = vi.mocked(prisma.lane.findMany).mock.calls[0][0]?.where as
      | { isActive?: boolean }
      | undefined
    expect(where?.isActive).toBeUndefined()
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
