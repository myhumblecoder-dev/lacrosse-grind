import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'
import { createBossBattle } from './createBossBattle'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({ prisma: { bossBattle: { upsert: vi.fn(), count: vi.fn(), findFirst: vi.fn() }, lane: { findFirst: vi.fn() } } }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

const weekStarting = new Date(Date.UTC(2026, 0, 5))

describe('createBossBattle', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('a foreign lane returns not-found before the LLM call', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue(null)

    const result = await createBossBattle({
      laneId: 'lane-foreign',
      weekStarting,
      selfReport: 'I did some drills.',
    })

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(generate).not.toHaveBeenCalled()
    expect(prisma.bossBattle.upsert).not.toHaveBeenCalled()
  })

  it('over the daily cap returns coach-limit without calling generate', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1' } as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(10)
    // Mocking process.env.COACH_DAILY_LIMIT via a side effect or assuming it's set in test env
    // Since we can't easily mock process.env without risk, we rely on the logic in the implementation
    // For this test, we assume the implementation checks against the env var.
    // We'll force the condition by making count high and assuming limit is low.
    process.env.COACH_DAILY_LIMIT = '5'

    const result = await createBossBattle({
      laneId: 'lane-1',
      weekStarting,
      selfReport: 'I did some drills.',
    })

    expect(result).toEqual({ ok: false, error: 'coach-limit' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('valid input calls generate and upserts with coachNote', async () => {
    vi.mocked(prisma.lane.findFirst).mockResolvedValue({ id: 'lane-1', userId: 'u1' } as any)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(0)
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
