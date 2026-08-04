import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generate } from '@/lib/llm'
import { editReflection } from './editReflection'

vi.mock('@/lib/db', () => ({ prisma: { weeklyReflection: { update: vi.fn() } } }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('editReflection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('regenerates the summary, updates, and returns coachSummary', async () => {
    vi.mocked(generate).mockResolvedValue('You kept the habit going.')
    vi.mocked(prisma.weeklyReflection.update).mockResolvedValue({} as never)
    const result = await editReflection('wr-1', 'Trained hard this week')
    expect(result).toEqual({ ok: true, coachSummary: 'You kept the habit going.' })
    expect(generate).toHaveBeenCalledOnce()
    expect(prisma.weeklyReflection.update).toHaveBeenCalledWith({
      where: { id: 'wr-1' },
      data: { playerNote: 'Trained hard this week', coachSummary: 'You kept the habit going.' },
    })
  })

  it('empty note returns validation without generate or db', async () => {
    const result = await editReflection('wr-1', '   ')
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(generate).not.toHaveBeenCalled()
    expect(prisma.weeklyReflection.update).not.toHaveBeenCalled()
  })

  it('missing id returns missing-id', async () => {
    const result = await editReflection('', 'note')
    expect(result).toEqual({ ok: false, error: 'missing-id' })
  })
})
