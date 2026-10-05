import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { getWeekStart, formatWeekLabel } from '@/lib/weekUtils'
import { getTrainingDay } from '@/lib/trainingDay'
import { getViewer } from '@/lib/viewer'

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      findMany: vi.fn(),
    },
    prize: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/viewer', () => ({ getViewer: vi.fn() }))

vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-int' }),
}))

describe('Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:hash' } as never)
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
  })

  it('the history queries are scoped to the active player, not the account', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })

    vi.mocked(prisma.prize.findUnique).mockResolvedValue({ id: 'prize', playerId: 'p1' } as any)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    await Page()

    expect(getViewer).toHaveBeenCalled()
    expect(prisma.prize.findUnique).toHaveBeenCalledWith({
      where: { playerId: 'p1' }
    })
    expect(prisma.lane.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ playerId: 'p1' })
    }))
  })

  it('does not query by userId — a second kid on the account must not appear', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    await Page()

    const laneArg = vi.mocked(prisma.lane.findMany).mock.calls[0][0]
    expect(laneArg?.where).not.toHaveProperty('userId')
    const prizeArg = vi.mocked(prisma.prize.findUnique).mock.calls[0][0]
    expect(prizeArg.where).not.toHaveProperty('userId')
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
        targetPerWeek: 5,
        sortOrder: 1,
        bossBattles: [],
        checkIns: [{ date: today, isRest: false } as any],
      },
      {
        id: '2',
        name: 'Retired Lane',
        emoji: '💀',
        isActive: false,
        targetPerWeek: 5,
        sortOrder: 2,
        bossBattles: [],
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
        targetPerWeek: 5,
        sortOrder: 1,
        bossBattles: [],
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
        targetPerWeek: 5,
        sortOrder: 1,
        bossBattles: [],
        checkIns: [{ date: new Date(), isRest: false } as any],
      },
      {
        id: '2',
        name: 'Empty Retired Lane',
        emoji: '💀',
        isActive: false,
        targetPerWeek: 5,
        sortOrder: 2,
        bossBattles: [],
        checkIns: [],
      },
    ] as any
    vi.mocked(prisma.lane.findMany).mockResolvedValue(lanes)

    const PageComponent = await Page()
    render(PageComponent)

    expect(screen.queryByText(/Empty Retired Lane/)).not.toBeInTheDocument()
  })

  it('only the day the boss fell is purple, not the whole week', async () => {
    // The case the old test could not see: with a single check-in day, "every
    // day purple" and "the boss day purple" look identical. Five days apart
    // they do not, and beating a boss used to repaint the whole week.
    const { prisma } = await import('@/lib/db')
    const monday = new Date('2026-08-17T00:00:00.000Z')
    const friday = new Date('2026-08-21T00:00:00.000Z')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [{ weekStarting: getWeekStart(monday), completedAt: friday }],
        checkIns: [
          { date: monday, isRest: false },
          { date: new Date('2026-08-18T00:00:00.000Z'), isRest: false },
          { date: new Date('2026-08-19T00:00:00.000Z'), isRest: false },
          { date: new Date('2026-08-20T00:00:00.000Z'), isRest: false },
          { date: friday, isRest: false },
        ],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelectorAll('.bg-purple-500')).toHaveLength(1)
    expect(container.querySelectorAll('.bg-green-400')).toHaveLength(4)
  })

  it('a boss beaten at a time of day still matches its calendar day', async () => {
    const { prisma } = await import('@/lib/db')
    const day = new Date('2026-08-18T00:00:00.000Z')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        // Beaten at 7pm, while the check-in is stored at UTC midnight.
        bossBattles: [{ weekStarting: getWeekStart(day), completedAt: new Date('2026-08-18T19:32:00.000Z') }],
        checkIns: [{ date: day, isRest: false }],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelectorAll('.bg-purple-500')).toHaveLength(1)
  })

  it('a session inside a battle week is purple', async () => {
    const { prisma } = await import('@/lib/db')
    const day = new Date('2026-08-18T00:00:00.000Z')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [{ weekStarting: getWeekStart(day), completedAt: day }],
        checkIns: [{ date: day, isRest: false }],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelectorAll('.bg-purple-500')).toHaveLength(1)
    expect(container.querySelectorAll('.bg-green-400')).toHaveLength(0)
  })

  it('a rest day inside a battle week stays blue', async () => {
    const { prisma } = await import('@/lib/db')
    const day = new Date('2026-08-18T00:00:00.000Z')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [{ weekStarting: getWeekStart(day), completedAt: day }],
        checkIns: [{ date: day, isRest: true }],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelectorAll('.bg-blue-300')).toHaveLength(1)
    expect(container.querySelectorAll('.bg-purple-500')).toHaveLength(0)
  })

  it('no battles means no purple', async () => {
    const { prisma } = await import('@/lib/db')
    const day = new Date('2026-08-18T00:00:00.000Z')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [],
        checkIns: [{ date: day, isRest: false }],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelectorAll('.bg-purple-500')).toHaveLength(0)
    expect(container.querySelectorAll('.bg-green-400')).toHaveLength(1)
  })

  it('weeks render newest first with formatted headers', async () => {
    const { prisma } = await import('@/lib/db')
    const late = getWeekStart(getTrainingDay(new Date()))
    const early = new Date(late.getTime() - 7 * 24 * 60 * 60 * 1000)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [],
        checkIns: [
          { date: early, isRest: false },
          { date: late, isRest: false },
        ],
      },
    ] as any)

    render(await Page())

    const headers = screen.getAllByRole('heading', { level: 2 })
    expect(headers).toHaveLength(2)
    expect(headers[0]).toHaveTextContent(`This week — ${formatWeekLabel(getWeekStart(late))}`)
    expect(headers[1]).toHaveTextContent(`Week of ${formatWeekLabel(getWeekStart(early))}`)
  })

  it('no empty squares render', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [],
        checkIns: [{ date: new Date('2026-08-18T00:00:00.000Z'), isRest: false }],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelectorAll('.bg-zinc-800')).toHaveLength(0)
    expect(container.querySelectorAll('.h-6.w-6')).toHaveLength(1)
  })

  it('the boss fought label appears only in the battle week', async () => {
    const { prisma } = await import('@/lib/db')
    const battleDay = new Date('2026-08-11T00:00:00.000Z')
    const plainDay = new Date('2026-08-18T00:00:00.000Z')
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [{ weekStarting: getWeekStart(battleDay), completedAt: battleDay }],
        checkIns: [
          { date: battleDay, isRest: false },
          { date: plainDay, isRest: false },
        ],
      },
    ] as any)

    render(await Page())

    expect(screen.getAllByText('⚔️ boss fought')).toHaveLength(1)
  })

  it('the current week is headed This week', async () => {
    const { prisma } = await import('@/lib/db')
    const thisWeekStart = getWeekStart(getTrainingDay(new Date()))
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [],
        checkIns: [{ date: thisWeekStart, isRest: false }],
      },
    ] as any)

    render(await Page())

    expect(
      screen.getByRole('heading', { level: 2, name: `This week — ${formatWeekLabel(thisWeekStart)}` })
    ).toBeInTheDocument()
  })

  it('a past week keeps the Week of header', async () => {
    const { prisma } = await import('@/lib/db')
    const thisWeekStart = getWeekStart(getTrainingDay(new Date()))
    const pastDay = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: 'l1', name: 'Jogs', emoji: '🏃', isActive: true, targetPerWeek: 5, sortOrder: 0,
        bossBattles: [],
        checkIns: [{ date: pastDay, isRest: false }],
      },
    ] as any)

    render(await Page())

    expect(
      screen.getByRole('heading', { level: 2, name: `Week of ${formatWeekLabel(getWeekStart(pastDay))}` })
    ).toBeInTheDocument()
    // The past week is not relabelled as the current one. A signed-in parent
    // does now get a separate empty "This week" section carrying the amend
    // door (epic 8), so the check is that the two are distinct headings rather
    // than that the current week is absent.
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: `This week — ${formatWeekLabel(getWeekStart(pastDay))}`,
      })
    ).not.toBeInTheDocument()
  })

  it('offers the amend door in the current week section for a signed-in viewer', async () => {
    const { prisma } = await import('@/lib/db')
    const today = getTrainingDay(new Date())
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: '1', name: 'Stick Skills', emoji: '🥍', targetPerWeek: 3, isActive: true,
        sortOrder: 0, startsOn: null, createdAt: new Date(0),
        checkIns: [{ date: today, isRest: false }],
        bossBattles: [], targetChanges: [],
      },
    ] as any)

    render(await Page())

    expect(screen.getByTestId('amend-link')).toHaveAttribute('href', '/amend')
  })

  it('never offers the amend door to a demo visitor', async () => {
    vi.mocked(getViewer).mockResolvedValue({ kind: 'demo' })

    render(await Page())

    expect(screen.queryByTestId('amend-link')).not.toBeInTheDocument()
  })

  it('still offers the door when the current week has nothing on the record', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    render(await Page())

    expect(screen.getByTestId('amend-link')).toBeInTheDocument()
    expect(screen.getByText(/Nothing on the record yet this week/)).toBeInTheDocument()
  })

  it('does not render two current-week sections when the week has check-ins', async () => {
    const { prisma } = await import('@/lib/db')
    const today = getTrainingDay(new Date())
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: '1', name: 'Stick Skills', emoji: '🥍', targetPerWeek: 3, isActive: true,
        sortOrder: 0, startsOn: null, createdAt: new Date(0),
        checkIns: [{ date: today, isRest: false }],
        bossBattles: [], targetChanges: [],
      },
    ] as any)

    render(await Page())

    expect(screen.getAllByTestId('amend-link')).toHaveLength(1)
    expect(screen.queryByText(/Nothing on the record yet this week/)).not.toBeInTheDocument()
  })

  it('the amend door offers setup, not amending, when no passphrase exists', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: null } as never)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    render(await Page())

    const link = screen.getByTestId('amend-link')
    expect(link).toHaveAttribute('href', '/account')
    expect(link).toHaveTextContent('Set up amend')
  })

  it('the amend door goes straight to amending once a passphrase exists', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:hash' } as never)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    render(await Page())

    const link = screen.getByTestId('amend-link')
    expect(link).toHaveAttribute('href', '/amend')
    expect(link).toHaveTextContent('Amend')
  })

  it('never renders the stored hash', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:secrethash' } as never)
    vi.mocked(prisma.lane.findMany).mockResolvedValue([])

    const { container } = render(await Page())

    expect(container.innerHTML).not.toContain('secrethash')
  })

  it('does not look up a passphrase for a demo visitor', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(getViewer).mockResolvedValue({ kind: 'demo' })

    render(await Page())

    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('rings a day a witness put on the record, so it does not read as the player\'s own', async () => {
    const { prisma } = await import('@/lib/db')
    const today = getTrainingDay(new Date())
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: '1', name: 'Stick Skills', emoji: '🥍', targetPerWeek: 3, isActive: true,
        sortOrder: 0, startsOn: null, createdAt: new Date(0),
        checkIns: [{ date: today, isRest: false, attestedAt: new Date() }],
        bossBattles: [], targetChanges: [],
      },
    ] as any)

    const { container } = render(await Page())

    const marked = container.querySelector('[data-attested="true"]')
    expect(marked).not.toBeNull()
    expect(marked?.getAttribute('title')).toContain('witness')
  })

  it('leaves a day the player tapped unringed', async () => {
    const { prisma } = await import('@/lib/db')
    const today = getTrainingDay(new Date())
    vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })
    vi.mocked(prisma.lane.findMany).mockResolvedValue([
      {
        id: '1', name: 'Stick Skills', emoji: '🥍', targetPerWeek: 3, isActive: true,
        sortOrder: 0, startsOn: null, createdAt: new Date(0),
        checkIns: [{ date: today, isRest: false, attestedAt: null }],
        bossBattles: [], targetChanges: [],
      },
    ] as any)

    const { container } = render(await Page())

    expect(container.querySelector('[data-attested="true"]')).toBeNull()
  })
})
