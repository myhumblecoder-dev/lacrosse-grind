import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { setLaneActive } from './setLaneActive'
import { playerLevel } from '@/lib/playerLevel'
import { requiredLanes } from '@/lib/laneRequirement'

vi.mock('@/lib/db', () => ({ 
  prisma: { 
    lane: { updateMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
    bossBattle: { count: vi.fn() },
    checkIn: { count: vi.fn() }
  } 
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('setLaneActive', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.lane.count).mockResolvedValue(4)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    // Default: the lane is retired and untouched this week, so switching it
    // on is a genuine return from retirement.
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ isActive: false } as never)
    vi.mocked(prisma.checkIn.count).mockResolvedValue(0)
  })

  it('deactivating below the demand floor is blocked', async () => {
    // Setup: 1 active lane left. If we deactivate this one, we have 0.
    // If requiredLanes for current level is > 0, it should block.
    vi.mocked(prisma.lane.count).mockResolvedValue(1)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
    
    // We don't mock playerLevel/requiredLanes because they are pure modules.
    // We rely on their real logic. If level 0 requires 1 lane, 1-1 < 1 is true.
    
    const result = await setLaneActive('lane-to-deactivate', false)
    
    expect(result).toEqual({ ok: false, error: 'blocked' })
    expect(prisma.lane.updateMany).not.toHaveBeenCalled()
  })

  it('activating is never blocked', async () => {
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })
    
    const result = await setLaneActive('lane-to-activate', true)
    
    expect(result).toEqual({ ok: true })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'lane-to-activate', userId: 'u1' },
      data: { isActive: true, startsOn: expect.any(Date) },
    })
  })

  it('sets isActive and returns ok', async () => {
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })
    
    const result = await setLaneActive('lane-1', false)
    
    expect(result).toEqual({ ok: true })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'lane-1', userId: 'u1' },
      data: { isActive: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('reactivating a lane restarts it on the coming Monday', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T18:00:00.000Z')) // Wednesday
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })

    await setLaneActive('lane-back', true)

    const data = vi.mocked(prisma.lane.updateMany).mock.calls[0][0].data as {
      startsOn: Date
    }
    expect(data.startsOn.toISOString()).toBe('2026-08-24T00:00:00.000Z')
    vi.useRealTimers()
  })

  it('retiring a lane never touches its start stamp', async () => {
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.lane.count).mockResolvedValue(9)

    await setLaneActive('lane-1', false)

    const data = vi.mocked(prisma.lane.updateMany).mock.calls[0][0].data
    expect(data).not.toHaveProperty('startsOn')
  })

  it('switching on a lane that is already active never benches it', async () => {
    // A no-op call must not push a running lane's start into next week.
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ isActive: true } as never)
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })

    await setLaneActive('lane-running', true)

    const data = vi.mocked(prisma.lane.updateMany).mock.calls[0][0].data
    expect(data).not.toHaveProperty('startsOn')
  })

  it('an off-and-on mis-tap keeps a lane already trained this week running', async () => {
    // Restarting it would hide check-ins from Today that the season grid
    // still counts, so the two screens would disagree.
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ isActive: false } as never)
    vi.mocked(prisma.checkIn.count).mockResolvedValue(3)
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 1 })

    await setLaneActive('lane-mistap', true)

    const data = vi.mocked(prisma.lane.updateMany).mock.calls[0][0].data
    expect(data).not.toHaveProperty('startsOn')
  })

  it('empty id returns missing-id without a db call', async () => {
    const result = await setLaneActive('', true)
    expect(result).toEqual({ ok: false, error: 'missing-id' })
    expect(prisma.lane.updateMany).not.toHaveBeenCalled()
  })

  it("another user's lane id returns not-found", async () => {
    vi.mocked(prisma.lane.updateMany).mockResolvedValue({ count: 0 })

    const result = await setLaneActive('other-lane-id', true)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(prisma.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'other-lane-id', userId: 'u1' },
      data: { isActive: true, startsOn: expect.any(Date) },
    })
  })
})