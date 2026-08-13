import { z } from "zod"

export const laneSchema = z.object({
  name: z.string().trim().min(1).max(40),
  emoji: z.string().trim().min(1).max(2).default("🥍"),
  targetPerWeek: z.number().int().min(1).max(7).default(5),
})

export const checkInSchema = z.object({
  laneId: z.string(), // cuid
  date: z.date(),
  isRest: z.boolean().default(false),
  note: z.string().max(200).optional().nullable(),
})

export const bossBattleSchema = z.object({
  laneId: z.string(), // cuid
  weekStarting: z.date(),
  selfReport: z.string().trim().min(1).max(1000),
})

export const reflectionSchema = z.object({
  weekStarting: z.date(),
  playerNote: z.string().trim().min(1).max(500),
})

export const prizeSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable().transform((val) => (val === "" ? undefined : val)),
  reasons: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  photoUrl: z.string().url().optional().nullable(),
})

export const swapSchema = z.object({
  outLaneId: z.string().min(1),
  inLaneId: z.string().min(1).optional(),
})

export type LaneInput = z.infer<typeof laneSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type BossBattleInput = z.infer<typeof bossBattleSchema>
export type ReflectionInput = z.infer<typeof reflectionSchema>
export type PrizeInput = z.infer<typeof prizeSchema>
export type SwapInput = z.infer<typeof swapSchema>