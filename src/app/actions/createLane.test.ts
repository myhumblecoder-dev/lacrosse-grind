import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { createLane } from './createLane'

vi.mock('@/lib/db', () => ({ prisma: { lane: { create: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('createLane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('the created lane belongs to the signed-in user', async () => {
    vi.mocked(prisma.lane.create).mockResolvedValue({ 
      id: 'lane-1', 
      name: 'Shooting', 
      emoji: '🎯', 
      targetPerWeek: 3, 
      isActive: true, 
      sortOrder: 0, 
      userId: 'u1', 
      createdAt: new Date(Date.UTC(2024, 0, 1))
    } as any)

    const input = { name: 'Shooting', emoji: '🎯', targetPerWeek: 3 }
    const result = await createLane(input)

    expect(result).toEqual({ ok: true, id: 'lane-1' })
    expect(requireUserId).toHaveBeenCalled()
    expect(prisma.lane.create).toHaveBeenCalledWith({
      data: {
        ...input,
        sortOrder: 0,
        userId: 'u1',
        startsOn: expect.any(Date)
      }
    })
  })

  it('a lane added mid-week starts on the coming Monday', async () => {
    vi.useFakeTimers()
    // Sunday — the last day of the week, when a fresh 5-a-week target would
    // otherwise be unreachable the moment it is created.
    vi.setSystemTime(new Date('2026-08-23T18:00:00.000Z'))
    vi.mocked(prisma.lane.create).mockResolvedValue({ id: 'lane-1' } as any)

    await createLane({ name: 'Squats', emoji: '🏋', targetPerWeek: 5 })

    const data = vi.mocked(prisma.lane.create).mock.calls[0][0].data as {
      startsOn: Date
    }
    expect(data.startsOn.toISOString()).toBe('2026-08-24T00:00:00.000Z')
    vi.useRealTimers()
  })

  it('a lane added on a Monday starts that same Monday', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T18:00:00.000Z'))
    vi.mocked(prisma.lane.create).mockResolvedValue({ id: 'lane-1' } as any)

    await createLane({ name: 'Squats', emoji: '🏋', targetPerWeek: 5 })

    const data = vi.mocked(prisma.lane.create).mock.calls[0][0].data as {
      startsOn: Date
    }
    expect(data.startsOn.toISOString()).toBe('2026-08-24T00:00:00.000Z')
    vi.useRealTimers()
  })

  it('adding a lane refreshes Today, not just the Lanes page', async () => {
    vi.mocked(prisma.lane.create).mockResolvedValue({ id: 'lane-1' } as any)

    await createLane({ name: 'Squats', emoji: '🏋', targetPerWeek: 5 })

    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('valid input creates lane and returns ok', async () => {
    vi.mocked(prisma.lane.create).mockResolvedValue({ id: 'lane-1' } as any)

    const result = await createLane({ name: 'Shooting', emoji: '🎯', targetPerWeek: 3, isActive: true })

    expect(result).toEqual({ ok: true, id: 'lane-1' })
    expect(prisma.lane.create).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.lane.create).mock.calls[0][0]
    expect(arg.data).toMatchObject({ name: 'Shooting', sortOrder: 0, userId: 'u1' })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('empty name returns validation error without db call', async () => {
    const result = await createLane({ name: '' })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.lane.create).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
