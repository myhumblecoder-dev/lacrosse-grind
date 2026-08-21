import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { generate } from '@/lib/llm'
import { editReflection } from './editReflection'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({ prisma: { weeklyReflection: { update: vi.fn(), findFirst: vi.fn(), count: vi.fn() } } }))
vi.mock('@/lib/llm', () => ({ generate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('editReflection', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('regenerates the summary, updates, and returns coachSummary', async () => {
    vi.mocked(prisma.weeklyReflection.findFirst).mockResolvedValue({ id: 'wr-1', userId: 'u1', playerNote: '', weekStarting: new Date(Date.UTC(2024, 0, 1)), coachSummary: '' } as any)
    vi.mocked(prisma.weeklyReflection.count).mockResolvedValue(0)
    vi.mocked(generate).mockResolvedValue('You kept the habit going.')
    vi.mocked(prisma.weeklyReflection.update).mockResolvedValue({} as never)

    const result = await editReflection('wr-1', 'Trained hard this week')

    expect(result).toEqual({ ok: true, coachSummary: 'You kept the habit going.' })
    expect(generate).toHaveBeenCalledWith(expect.stringContaining('the player'))
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

  it('a foreign reflection returns not-found before the LLM call', async () => {
    vi.mocked(prisma.weeklyReflection.findFirst).mockResolvedValue(null)

    const result = await editReflection('wr-foreign', 'Trained hard this week')

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(generate).not.toHaveBeenCalled()
    expect(prisma.weeklyReflection.update).not.toHaveBeenCalled()
  })

  it('over the daily cap returns coach-limit without calling generate', async () => {
    vi.mocked(prisma.weeklyReflection.findFirst).mockResolvedValue({ id: 'wr-1', userId: 'u1', playerNote: '', weekStarting: new Date(Date.UTC(2024, 0, 1)), coachSummary: '' } as any)
    vi.mocked(prisma.weeklyReflection.count).mockResolvedValue(10)
    // Assuming COACH_DAILY_LIMIT is set to something like 5 in the environment for this test to trigger
    process.env.COACH_DAILY_LIMIT = '5'

    const result = await editReflection('wr-1', 'Trained hard this week')

    expect(result).toEqual({ ok: false, error: 'coach-limit' })
    expect(generate).not.toHaveBeenCalled()
    expect(prisma.weeklyReflection.update).not.toHaveBeenCalled()
  })
})
