import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createCheckIn } from './createCheckIn'

vi.mock('@/lib/db', () => ({ prisma: { checkIn: { upsert: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const date = new Date(Date.UTC(2026, 0, 5))

describe('createCheckIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid check-in upserts and returns ok', async () => {
    vi.mocked(prisma.checkIn.upsert).mockResolvedValue({ id: 'ci-1' } as never)

    const result = await createCheckIn({ laneId: 'lane-1', date, isRest: false })

    expect(result).toEqual({ ok: true, id: 'ci-1' })
    expect(prisma.checkIn.upsert).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.checkIn.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ laneId_date: { laneId: 'lane-1', date } })
    expect(arg.create).toMatchObject({ laneId: 'lane-1', date, isRest: false })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('missing laneId returns validation error without db call', async () => {
    const result = await createCheckIn({ date, isRest: false })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.checkIn.upsert).not.toHaveBeenCalled()
  })
})
