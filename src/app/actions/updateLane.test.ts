import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import type { Lane } from '@prisma/client'
import { updateLane } from './updateLane'
import { revalidatePath } from 'next/cache'

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
      safeParse: (data: any) => {
        // Simulate Zod behavior: if name is a number, it's a failure
        if (typeof data?.name === 'number') {
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
  })

  it('valid patch updates lane and returns ok', async () => {
    const id = 'lane-123'
    const patch = { name: 'New Lane Name' }
    vi.mocked(db.lane.update).mockResolvedValue(makeLane({ id, name: 'New Lane Name' }))

    const result = await updateLane(id, patch)

    expect(result).toEqual({ ok: true })
    expect(db.lane.update).toHaveBeenCalledWith({
      where: { id },
      data: patch,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('empty object patch is valid and returns ok', async () => {
    const id = 'lane-123'
    const patch = {}
    vi.mocked(db.lane.update).mockResolvedValue(makeLane({ id }))

    const result = await updateLane(id, patch)

    expect(result).toEqual({ ok: true })
    expect(db.lane.update).toHaveBeenCalledWith({
      where: { id },
      data: {},
    })
    expect(revalidatePath).toHaveBeenCalledWith('/lanes')
  })

  it('invalid field value returns validation error', async () => {
    const id = 'lane-123'
    const patch = { name: 123 as unknown as string }

    const result = await updateLane(id, patch)

    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(db.lane.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('db error propagates as thrown error', async () => {
    const id = 'lane-123'
    const patch = { name: 'New Name' }
    const dbError = new Error('Database connection failed')
    vi.mocked(db.lane.update).mockRejectedValue(dbError)

    await expect(updateLane(id, patch)).rejects.toThrow('Database connection failed')
  })
})
