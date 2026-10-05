import { z } from "zod"

export const laneSchema = z.object({
  name: z.string().trim().min(1).max(40),
  emoji: z.string().trim().min(1).max(2).default("🥍"),
  targetPerWeek: z.number().int().min(1).max(7).default(5),
})

/**
 * Pin a day to UTC midnight, the form every `CheckIn.date` is stored in.
 *
 * `@@unique([laneId, date])` is on the exact timestamp, not the calendar day, so
 * an un-normalized date is not a harmless variation: `2026-09-29T12:00:00Z`
 * passes every window check (they all compare day keys) and then misses the
 * existing midnight row, inserting a SECOND check-in for the same day.
 * `buildWeekRecaps` counts one hit per row, so that day would score twice and
 * could qualify a week on its own. Normalizing in the schema makes the unique
 * index mean what the rest of the code assumes it means.
 */
const utcMidnight = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

export const checkInSchema = z.object({
  laneId: z.string(), // cuid
  date: z.date().transform(utcMidnight),
  isRest: z.boolean().default(false),
  note: z.string().max(200).optional().nullable(),
})

export const bossBattleSchema = z.object({
  laneId: z.string(), // cuid
  weekStarting: z.date(),
  selfReport: z.string().trim().min(1).max(1000),
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

/**
 * The shortest witness passphrase accepted.
 *
 * Lives here, not in `witnessPassphrase.ts`, so that nothing needs to import
 * the crypto module to learn it. This file is already imported by actions; the
 * day a client form imports a schema from it, an arrow pointing at
 * `node:crypto` would pull it into the browser bundle and break the build.
 */
export const MIN_WITNESS_PASSPHRASE_LENGTH = 6

/**
 * Not `.trim()`ed on purpose: a leading or trailing space a parent chose must
 * survive the round trip, or the passphrase they set is not the one they typed.
 */
export const witnessPassphraseSchema = z
  .string()
  .min(MIN_WITNESS_PASSPHRASE_LENGTH)
  .max(200)

/**
 * `passphrase` is `min(1)`, not `witnessPassphraseSchema`: a wrong guess must
 * come back as a failed verification, never as a validation error that tells
 * the guesser how long the real one is.
 */
export const attestCheckInSchema = z.object({
  laneId: z.string().min(1),
  date: z.date().transform(utcMidnight),
  isRest: z.boolean().default(false),
  note: z.string().trim().max(200).optional().nullable(),
  passphrase: z.string().min(1),
})

export const withdrawCheckInSchema = z.object({
  laneId: z.string().min(1),
  date: z.date().transform(utcMidnight),
  note: z.string().trim().max(200).optional().nullable(),
  passphrase: z.string().min(1),
})

export type LaneInput = z.infer<typeof laneSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type BossBattleInput = z.infer<typeof bossBattleSchema>
export type PrizeInput = z.infer<typeof prizeSchema>
export type SwapInput = z.infer<typeof swapSchema>
export type AttestCheckInInput = z.infer<typeof attestCheckInSchema>
export type WithdrawCheckInInput = z.infer<typeof withdrawCheckInSchema>
