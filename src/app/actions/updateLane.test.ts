import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import type { Lane } from '@prisma/client'
import { updateLane } from './updateLane'
import { requireUserId } from '@/lib/tenancy'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    lane: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    checkIn: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    bossBattle: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    weeklyReflection: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    laneTarget: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    streakFreeze: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mocking the validation schema to prevent global state leakage from the real schema
// which might contain default values that interfere with the 'empty object' test.
vi.mock('@/lib/validation', () => ({
  laneSchema: {
    partial: () => ({
      safeParse: (data: unknown) => {
        const d = data as Record<string, unknown>;
        // Simulate Zod behavior: if name is a number, it's a failure
        if (d && typeof d.name === 'number') {
          return { success: false };
        }
        // If data is an empty object, return success with empty data
        // If data has fields, return success with those fields
        return { success: true, data: data };
      }
    })
  }
}))

const makeLane = (overrides: Partial<Lane> = {}): Lane =>
  ({
    id: '',
    name: '',
    createdAt: new Date(Date.UTC(2024, 0, 1)),
    updatedAt: new Date(Date.UTC(2024, 0, 1)),
    ...overrides,
  } as unknown as Lane)

describe('updateLane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(db.lane.findFirst).mockResolvedValue(
      makeLane({ id: 'lane-123', targetPerWeek: 3, targetChanges: [] } as never)
    )
  })

  it('valid patch updates lane and returns ok', async () => {
    const id = 'lane-123'
    const patch = { name: 'New Lane Name' }
    vi.mocked(db.lane.updateMany).mockResolvedValue({ count: 1 })

    const result = await updateLane(id, patch)

    expect(result).toEqual({ ok: true })
    expect(db.lane.updateMany).toHaveBeenCalledWith({
      where: { id, userId: 'u1' },
      data: patch,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('empty object patch is valid and returns ok', async () => {
    const id = 'lane-123'
    const patch = {}
    vi.mocked(db.lane.updateMany).mockResolvedValue({ count: 1 })

    const result = await updateLane(id, patch)

    expect(result).toEqual({ ok: true })
    // Nothing to write, so the row is left alone rather than issued an
    // empty update — which real Prisma reports as zero rows matched.
    expect(db.lane.updateMany).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('invalid field value returns validation error', async () => {
    const id = 'lane-123'
    const patch = { name: 123 as unknown as string }

    const result = await updateLane(id, patch)

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(db.lane.updateMany).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('db error propagates as thrown error', async () => {
    const id = 'lane-123'
    const patch = { name: 'New Name' }
    const dbError = new Error('Database connection failed')
    vi.mocked(db.lane.updateMany).mockRejectedValue(dbError)

    await expect(updateLane(id, patch)).rejects.toThrow('Database connection failed')
  })

  it("another user's lane id returns not-found", async () => {
    vi.mocked(db.lane.findFirst).mockResolvedValue(null)

    const result = await updateLane('foreign-lane', { name: 'X' })

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(db.lane.updateMany).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('the update is scoped to the owner', async () => {
    vi.mocked(db.lane.updateMany).mockResolvedValue({ count: 1 })

    await updateLane('lane-1', { name: 'X' })

    expect(db.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'lane-1', userId: 'u1' },
      data: { name: 'X' },
    })
  })
})

describe('updateLane — a new target starts next week', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(db.lane.updateMany).mockResolvedValue({ count: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules the target for the coming Monday instead of writing it now', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T18:00:00.000Z')) // Wednesday
    vi.mocked(db.lane.findFirst).mockResolvedValue(
      makeLane({ id: 'lane-1', targetPerWeek: 3, targetChanges: [] } as never)
    )

    const result = await updateLane('lane-1', { targetPerWeek: 5 })

    expect(result).toEqual({ ok: true })
    // The column itself is never touched — that is what would re-score history
    // — and with nothing else in the patch the row is not written at all.
    expect(db.lane.updateMany).not.toHaveBeenCalled()
    expect(db.laneTarget.upsert).toHaveBeenCalledWith({
      where: {
        laneId_effectiveFrom: {
          laneId: 'lane-1',
          effectiveFrom: new Date('2026-08-24T00:00:00.000Z'),
        },
      },
      update: { target: 5 },
      create: {
        laneId: 'lane-1',
        target: 5,
        effectiveFrom: new Date('2026-08-24T00:00:00.000Z'),
      },
    })
  })

  it('applies a rename at once while deferring the target', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T18:00:00.000Z'))
    vi.mocked(db.lane.findFirst).mockResolvedValue(
      makeLane({ id: 'lane-1', targetPerWeek: 3, targetChanges: [] } as never)
    )

    await updateLane('lane-1', { name: 'Wall ball', targetPerWeek: 5 })

    expect(db.lane.updateMany).toHaveBeenCalledWith({
      where: { id: 'lane-1', userId: 'u1' },
      data: { name: 'Wall ball' },
    })
    expect(db.laneTarget.upsert).toHaveBeenCalled()
  })

  it('a rename that resubmits the same target schedules nothing', async () => {
    // The edit form always posts all three fields, so an unchanged number must
    // not litter the lane with no-op scheduled changes.
    vi.mocked(db.lane.findFirst).mockResolvedValue(
      makeLane({ id: 'lane-1', targetPerWeek: 3, targetChanges: [] } as never)
    )

    await updateLane('lane-1', { name: 'Renamed', targetPerWeek: 3 })

    expect(db.laneTarget.upsert).not.toHaveBeenCalled()
  })

  it('a second edit before Monday replaces the queued change', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T18:00:00.000Z'))
    const effectiveFrom = new Date('2026-08-24T00:00:00.000Z')
    vi.mocked(db.lane.findFirst).mockResolvedValue(
      makeLane({
        id: 'lane-1',
        targetPerWeek: 3,
        targetChanges: [{ target: 5, effectiveFrom }],
      } as never)
    )

    await updateLane('lane-1', { targetPerWeek: 7 })

    // Same key, so it upserts over the pending row rather than stacking a
    // second change for the same Monday.
    expect(db.laneTarget.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { laneId_effectiveFrom: { laneId: 'lane-1', effectiveFrom } },
        update: { target: 7 },
      })
    )
  })

  it("a foreign lane never reaches the target schedule", async () => {
    vi.mocked(db.lane.findFirst).mockResolvedValue(null)

    const result = await updateLane('foreign', { targetPerWeek: 7 })

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(db.laneTarget.upsert).not.toHaveBeenCalled()
  })
})

describe('updateLane — ownership is never proved by an empty update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(db.lane.findFirst).mockResolvedValue(
      makeLane({ id: 'lane-1', targetPerWeek: 3, targetChanges: [] } as never)
    )
    vi.mocked(db.lane.updateMany).mockResolvedValue({ count: 1 })
  })

  // Real Prisma returns { count: 0 } for updateMany with an empty `data`, even
  // for a row that exists and is owned. Gating not-found on that count made
  // every target-only edit report "not-found" and silently drop the change.
  // Mocks cannot reproduce that, so the contract is asserted instead: an
  // update is only ever issued when there is something to write.
  it.each([
    ['target only', { targetPerWeek: 5 }],
    ['empty patch', {}],
    ['name only', { name: 'Renamed' }],
    ['name and target', { name: 'Renamed', targetPerWeek: 5 }],
  ])('%s never issues an update with nothing to write', async (_label, patch) => {
    await updateLane('lane-1', patch)

    for (const call of vi.mocked(db.lane.updateMany).mock.calls) {
      expect(Object.keys(call[0].data as object).length).toBeGreaterThan(0)
    }
  })

  it('a target-only edit still schedules the change', async () => {
    const result = await updateLane('lane-1', { targetPerWeek: 5 })

    expect(result).toEqual({ ok: true })
    expect(db.laneTarget.upsert).toHaveBeenCalled()
  })
})
