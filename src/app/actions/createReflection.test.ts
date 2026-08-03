import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generate } from '@/lib/llm'
import { revalidatePath } from 'next/cache'
import { createReflection } from './createReflection'

vi.mock('@/lib/db', () => ({ prisma: { weeklyReflection: { upsert: vi.fn() } } }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const weekStarting = new Date(Date.UTC(2026, 0, 5))

describe('createReflection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid input calls generate and upserts with coachSummary', async () => {
    vi.mocked(generate).mockResolvedValue('You stayed consistent all week — that is the habit taking hold.')
    vi.mocked(prisma.weeklyReflection.upsert).mockResolvedValue({ id: 'wr-1' } as never)

    const result = await createReflection({
      weekStarting,
      playerNote: 'Trained four days, rested two, felt strong.',
    })

    expect(result).toEqual({ ok: true, id: 'wr-1' })
    expect(generate).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.weeklyReflection.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ weekStarting })
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
