import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createLane } from './createLane'

vi.mock('@/lib/db', () => ({ prisma: { lane: { create: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createLane', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid input creates lane and returns ok', async () => {
    vi.mocked(prisma.lane.create).mockResolvedValue({ id: 'lane-1' } as never)

    const result = await createLane({ name: 'Shooting' })

    expect(result).toEqual({ ok: true, id: 'lane-1' })
    expect(prisma.lane.create).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.lane.create).mock.calls[0][0]
    expect(arg.data).toMatchObject({ name: 'Shooting', sortOrder: 0 })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('empty name returns validation error without db call', async () => {
    const result = await createLane({ name: '' })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(prisma.lane.create).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
