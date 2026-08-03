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

export type LaneInput = z.infer<typeof laneSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type BossBattleInput = z.infer<typeof bossBattleSchema>
export type ReflectionInput = z.infer<typeof reflectionSchema>