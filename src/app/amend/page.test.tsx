import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { requirePlayerId } from '@/lib/tenancy'
import { getTrainingDay } from '@/lib/trainingDay'
import Page from './page'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    prize: { findUnique: vi.fn() },
    lane: { findMany: vi.fn() },
  },
}))
// The real redirect throws to stop rendering, so the mock does too.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error('NEXT_REDIRECT:' + path)
  }),
}))
vi.mock('@/lib/tenancy', () => ({ requirePlayerId: vi.fn() }))
vi.mock('@/lib/trainingDay', () => ({ getTrainingDay: vi.fn() }))
vi.mock('@/app/actions/attestCheckIn', () => ({ attestCheckIn: vi.fn() }))
vi.mock('@/app/actions/withdrawCheckIn', () => ({ withdrawCheckIn: vi.fn() }))

// Wednesday; its week runs Mon 2026-09-28 → Sun 2026-10-04.
const WEDNESDAY = new Date(Date.UTC(2026, 8, 30))
const MONDAY = new Date(Date.UTC(2026, 8, 28))

const session = { user: { id: 'u1', email: 'parent@example.com' } }

function laneRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lane-1',
    name: 'Stick Skills',
    emoji: '🥍',
    sortOrder: 0,
    startsOn: null,
    checkIns: [],
    removals: [],
    ...overrides,
  }
}

describe('AmendPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(session as never)
    vi.mocked(requirePlayerId).mockResolvedValue('p1')
    vi.mocked(getTrainingDay).mockReturnValue(WEDNESDAY)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:hash' } as never)
    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ seasonStart: null } as never)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([laneRow()] as never)
  })

  it('sends a visitor with no session to sign in', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT:/signin')
  })

  it('does not read any lane when there is no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    await expect(Page()).rejects.toThrow()
    expect(prisma.lane.findMany).not.toHaveBeenCalled()
  })

  it('sends a parent with no passphrase to the account page', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: null } as never)

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT:/account')
  })

  it('does not read any lane when no passphrase is set', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: null } as never)

    await expect(Page()).rejects.toThrow()
    expect(prisma.lane.findMany).not.toHaveBeenCalled()
  })

  it('scopes the lane query to the active player', async () => {
    render(await Page())

    const arg = vi.mocked(prisma.lane.findMany).mock.calls[0][0]
    expect(arg?.where).toEqual({ isActive: true, playerId: 'p1' })
  })

  it("fetches only this week's check-ins and removals", async () => {
    render(await Page())

    const arg = vi.mocked(prisma.lane.findMany).mock.calls[0][0]
    expect(arg?.include?.checkIns).toEqual({ where: { date: { gte: MONDAY } } })
    expect(arg?.include?.removals).toEqual({ where: { date: { gte: MONDAY } } })
  })

  it('scopes the prize query to the active player', async () => {
    render(await Page())

    expect(prisma.prize.findUnique).toHaveBeenCalledWith({ where: { playerId: 'p1' } })
  })

  it('renders the grid when a lane is running', async () => {
    render(await Page())

    expect(screen.getByTestId('amend-grid')).toBeInTheDocument()
    expect(screen.getByTestId('amend-row-lane-1')).toBeInTheDocument()
  })

  it('renders three cells on a Wednesday', async () => {
    render(await Page())

    expect(screen.getByTestId('amend-cell-lane-1-2026-09-28')).toBeInTheDocument()
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-30')).toBeInTheDocument()
    expect(screen.queryByTestId('amend-cell-lane-1-2026-10-01')).not.toBeInTheDocument()
  })

  it('leaves out a lane that has not started this week', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      laneRow({ startsOn: new Date(Date.UTC(2026, 9, 5)) }),
    ] as never)

    render(await Page())

    expect(screen.getByTestId('amend-no-lanes')).toBeInTheDocument()
    expect(screen.queryByTestId('amend-grid')).not.toBeInTheDocument()
  })

  it('explains itself rather than showing an empty grid when nothing is running', async () => {
    vi.mocked(prisma.lane.findMany).mockResolvedValue([] as never)

    render(await Page())

    expect(screen.getByTestId('amend-no-lanes')).toBeInTheDocument()
  })

  it('offers a way back to history', async () => {
    render(await Page())

    expect(screen.getByTestId('amend-back')).toHaveAttribute('href', '/history')
  })

  it('says the window is the current week', async () => {
    const { container } = render(await Page())

    expect(container.textContent).toMatch(/current week/)
  })

  it('never renders the stored hash', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:secrethash' } as never)

    const { container } = render(await Page())

    expect(container.innerHTML).not.toContain('secrethash')
  })

  it('uses no deficit language', async () => {
    const { container } = render(await Page())

    expect(container.textContent ?? '').not.toMatch(/missed|failed|deficit|cheat/i)
  })
})
