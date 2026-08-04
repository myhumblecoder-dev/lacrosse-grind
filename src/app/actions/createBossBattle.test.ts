import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'
import { createBossBattle } from './createBossBattle'

vi.mock('@/lib/db', () => ({ prisma: { bossBattle: { upsert: vi.fn() } } }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const weekStarting = new Date(Date.UTC(2026, 0, 5))

describe('createBossBattle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid input calls generate and upserts with coachNote', async () => {
    vi.mocked(generate).mockResolvedValue('Keep showing up — the reps are the win.')
    vi.mocked(prisma.bossBattle.upsert).mockResolvedValue({ id: 'bb-1' } as never)

    const result = await createBossBattle({
      laneId: 'lane-1',
      weekStarting,
      selfReport: 'Worked my off-hand cradle for 20 minutes.',
    })

    expect(result).toEqual({ ok: true, id: 'bb-1', coachNote: expect.any(String) })
    expect(generate).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.bossBattle.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ laneId_weekStarting: { laneId: 'lane-1', weekStarting } })
    expect(arg.create).toMatchObject({ coachNote: 'Keep showing up — the reps are the win.' })
    expect(revalidatePath).toHaveBeenCalledWith('/boss-battles')
  })

  it('invalid input returns validation error without generate or db', async () => {
    const result = await createBossBattle({ laneId: 'lane-1', weekStarting, selfReport: '' })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(generate).not.toHaveBeenCalled()
    expect(prisma.bossBattle.upsert).not.toHaveBeenCalled()
  })
})
