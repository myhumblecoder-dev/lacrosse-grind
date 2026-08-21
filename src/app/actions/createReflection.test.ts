import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'
import { createReflection } from './createReflection'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({ prisma: { weeklyReflection: { upsert: vi.fn(), count: vi.fn() } } }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

const weekStarting = new Date(Date.UTC(2026, 0, 5))

describe('createReflection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('the upsert is keyed to the signed-in user', async () => {
    vi.mocked(generate).mockResolvedValue('Summary text')
    vi.mocked(prisma.weeklyReflection.upsert).mockResolvedValue({ id: 'wr-1' } as never)
    vi.mocked(prisma.weeklyReflection.count).mockResolvedValue(0)

    await createReflection({
      weekStarting,
      playerNote: 'Trained four days.',
    })

    const arg = vi.mocked(prisma.weeklyReflection.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({
      userId_weekStarting: {
        userId: 'u1',
        weekStarting,
      },
    })
    expect(arg.create).toMatchObject({ userId: 'u1' })
  })

  it('over the daily cap returns coach-limit without calling generate', async () => {
    vi.mocked(prisma.weeklyReflection.count).mockResolvedValue(10)
    // Assuming COACH_DAILY_LIMIT is set to something like 5 in env for this test
    process.env.COACH_DAILY_LIMIT = '5'

    const result = await createReflection({
      weekStarting,
      playerNote: 'Trained four days.',
    })

    expect(result).toEqual({ ok: false, error: 'coach-limit' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('valid input calls generate and upserts with coachSummary', async () => {
    vi.mocked(generate).mockResolvedValue('You stayed consistent all week — that is the habit taking hold.')
    vi.mocked(prisma.weeklyReflection.upsert).mockResolvedValue({ id: 'wr-1' } as never)
    vi.mocked(prisma.weeklyReflection.count).mockResolvedValue(0)

    const result = await createReflection({
      weekStarting,
      playerNote: 'Trained four days, rested two, felt strong.',
    })

    expect(result).toEqual({ ok: true, id: 'wr-1', coachSummary: 'You stayed consistent all week — that is the habit taking hold.' })
    expect(generate).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.weeklyReflection.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({
      userId_weekStarting: {
        userId: 'u1',
        weekStarting,
      },
    })
    expect(arg.create).toMatchObject({ coachSummary: 'You stayed consistent all week — that is the habit taking hold.' })
    expect(revalidatePath).toHaveBeenCalledWith('/reflection')
  })

  it('invalid input returns validation error without generate or db', async () => {
    const result = await createReflection({ weekStarting, playerNote: '' })

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(generate).not.toHaveBeenCalled()
    expect(prisma.weeklyReflection.upsert).not.toHaveBeenCalled()
  })
})
