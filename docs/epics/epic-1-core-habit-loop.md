# Epic 1 — Core Habit Loop

*Foundation: schema, DB client, utility libs, lane management, daily check-in dashboard, streak tracking.*

---

## Story 1.1 — Prisma Schema

**Depends on:** (none)

**Files to modify:**
- `prisma/schema.prisma`

**Acceptance Criteria:**
- `prisma/schema.prisma` contains exactly these five models: `Lane`, `CheckIn`, `BossBattle`, `WeeklyReflection`, `StreakFreeze` with all fields from `docs/architecture.md §2`.
- Running `prisma generate` completes without error.

---

## Story 1.1b — DB Client Singleton

**Depends on:** Story 1.1

**Files to create:**
- `src/lib/db.ts`

**Acceptance Criteria:**
- `src/lib/db.ts` exports `prisma` (a `PrismaClient` instance) using the `globalThis` singleton guard: `const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }; export const prisma = globalForPrisma.prisma ?? new PrismaClient(); if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;`.
- Implement `prisma` exactly once; do NOT emit an alternate variant.
- No test file required — this is a thin singleton wrapper with no branching logic.

---

## Story 1.2 — Week & Date Utilities

**Depends on:** Story 1.1b

**Files to create:**
- `src/lib/weekUtils.ts`
- `src/lib/weekUtils.test.ts`

**Acceptance Criteria:**
- `getWeekStart(date: Date): Date` returns the UTC Monday of the ISO week containing `date`; input is a Date assumed UTC.
- `get2WeekBlockStart(date: Date): Date` returns the UTC Monday that starts the 2-week boss-battle block containing `date`; blocks are numbered from a fixed epoch (2024-01-01); blocks always start on a Monday.
- `formatWeekLabel(date: Date): string` returns a string in the format `"Week of Mon DD MMM YYYY"`; for Monday 2026-01-05 UTC it returns `"Week of Mon 05 Jan 2026"`; uses `formatInTimeZone(d, 'UTC', 'EEE dd MMM yyyy')` from `date-fns-tz`.
- All date arithmetic uses `date-fns` / `date-fns-tz`; no `new Date(string)` string parsing.
- Implement each function exactly once; omit return-type annotations and let TS infer.
- `weekUtils.test.ts` covers: (see Testing section)

**Testing:**
- Test getWeekStart Monday input
- Test getWeekStart Wednesday input
- Test getWeekStart Sunday input
- Test get2WeekBlockStart same block as Monday
- Test get2WeekBlockStart two weeks apart different blocks
- Test formatWeekLabel output format

Write ONLY these tests.

---

## Story 1.3 — Streak Computation Library

**Depends on:** Story 1.1b

**Files to create:**
- `src/lib/streak.ts`
- `src/lib/streak.test.ts`

**Acceptance Criteria:**
- `computeStreak(checkIns: { date: Date; isRest: boolean }[], today: Date): number` returns the number of consecutive calendar days ending on `today` (inclusive) where a check-in exists; rest entries count as hits.
- If no check-in exists for `today`, streak is 0.
- Uses `differenceInCalendarDays` from `date-fns`; no manual date math.
- Implement `computeStreak` exactly once; omit return-type annotation.
- `streak.test.ts` covers: (see Testing section)

**Testing:**
- Test empty array returns zero
- Test single hit today returns one
- Test three consecutive days returns three
- Test gap breaks streak
- Test rest day counts as hit
- Test no hit today returns zero

Write ONLY these tests.

---

## Story 1.4 — Zod Validation Schemas

**Depends on:** Story 1.1b

**Files to create:**
- `src/lib/validation.ts`
- `src/lib/validation.test.ts`

**Acceptance Criteria:**
- `laneSchema` (Zod object): `name` (string, 1–40 chars, trimmed), `emoji` (string, 1–2 chars, default `"🥍"`), `targetPerWeek` (integer 1–7, default 5).
- `checkInSchema` (Zod object): `laneId` (cuid string, required), `date` (Date, required), `isRest` (boolean, default false), `note` (string ≤200 chars, optional).
- `bossBattleSchema` (Zod object): `laneId` (cuid, required), `weekStarting` (Date, required), `selfReport` (string 1–1000 chars, trimmed).
- `reflectionSchema` (Zod object): `weekStarting` (Date, required), `playerNote` (string 1–500 chars, trimmed).
- Export each schema + its inferred type (`LaneInput`, `CheckInInput`, `BossBattleInput`, `ReflectionInput`).
- `validation.test.ts` covers: (see Testing section)

**Testing:**
- Test laneSchema valid input passes
- Test laneSchema empty name fails
- Test laneSchema name too long fails
- Test checkInSchema valid input passes
- Test checkInSchema missing laneId fails
- Test bossBattleSchema empty selfReport fails
- Test reflectionSchema too long playerNote fails

Write ONLY these tests.

---

## Story 1.5 — createLane Action

**Depends on:** Story 1.4

**Files to create:**
- `src/app/actions/createLane.ts`
- `src/app/actions/createLane.test.ts`

**Acceptance Criteria:**
- `createLane(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the sole export.
- Validates `input` with `laneSchema`; returns `{ ok: false, error: 'validation' }` on parse failure without calling Prisma.
- On success: calls `prisma.lane.create({ data: { ...parsed, sortOrder: 0 } })` and returns `{ ok: true, id: lane.id }`.
- Calls `revalidatePath('/lanes')` after successful create.
- Implement `createLane` exactly once; do NOT emit an alternate variant.
- `createLane.test.ts` covers: (see Testing section)

**Testing:**
- Test valid input creates lane and returns ok
- Test empty name returns validation error without db call
- Test db error propagates as thrown error

Write ONLY these tests.

---

## Story 1.6 — updateLane Action

**Depends on:** Story 1.4

**Files to create:**
- `src/app/actions/updateLane.ts`
- `src/app/actions/updateLane.test.ts`

**Acceptance Criteria:**
- `updateLane(id: string, patch: unknown): Promise<{ ok: true } | { ok: false; error: string }>` is the sole export.
- `patch` is validated with `laneSchema.partial()` (all fields optional).
- Calls `prisma.lane.update({ where: { id }, data: parsed })` on success.
- Returns `{ ok: false, error: 'validation' }` on Zod failure without calling Prisma.
- Calls `revalidatePath('/lanes')` after successful update.
- Implement `updateLane` exactly once; do NOT emit an alternate variant.
- `updateLane.test.ts` covers: (see Testing section)

**Testing:**
- Test valid patch updates lane and returns ok
- Test empty object patch is valid and returns ok
- Test invalid field value returns validation error
- Test db error propagates as thrown error

Write ONLY these tests.

---

## Story 1.7 — createCheckIn Action

**Depends on:** Story 1.4

**Files to create:**
- `src/app/actions/createCheckIn.ts`
- `src/app/actions/createCheckIn.test.ts`

**Acceptance Criteria:**
- `createCheckIn(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the sole export.
- Validates with `checkInSchema`; returns `{ ok: false, error: 'validation' }` on failure without DB call.
- Calls `prisma.checkIn.upsert({ where: { laneId_date: { laneId, date } }, update: { isRest, note }, create: { ...parsed } })`.
- Calls `revalidatePath('/')` after success.
- `createCheckIn.test.ts` covers: (see Testing section)

**Testing:**
- Test valid check-in upserts and returns ok
- Test rest entry passes isRest true
- Test missing laneId returns validation error without db call
- Test db error propagates

Write ONLY these tests.

---

## Story 1.8 — deleteCheckIn Action

**Depends on:** Story 1.4

**Files to create:**
- `src/app/actions/deleteCheckIn.ts`
- `src/app/actions/deleteCheckIn.test.ts`

**Acceptance Criteria:**
- `deleteCheckIn(laneId: string, date: Date): Promise<{ ok: true } | { ok: false; error: string }>` is the sole export.
- Calls `prisma.checkIn.delete({ where: { laneId_date: { laneId, date } } })`.
- If Prisma throws (record not found), returns `{ ok: false, error: 'not-found' }`.
- Calls `revalidatePath('/')` after successful delete.
- Implement `deleteCheckIn` exactly once; do NOT emit alternate variant.
- `deleteCheckIn.test.ts` covers: (see Testing section)

**Testing:**
- Test valid laneId and date deletes and returns ok
- Test prisma not found error returns not-found error
- Test revalidatePath called on success

Write ONLY these tests.

---

## Story 1.9 — StreakBadge Component

**Depends on:** Story 1.3

**Files to create:**
- `src/components/StreakBadge.tsx`
- `src/components/StreakBadge.test.tsx`

**Acceptance Criteria:**
- `StreakBadge({ streak }: { streak: number })` is the sole export; no `"use client"` (server component).
- Renders a `🔥` emoji followed by the streak count; for `streak=5` renders `"🔥 5"`.
- When `streak === 0`, renders `🟢` and text `"Start your streak"`.
- Styled with Tailwind only; no bespoke CSS.
- `StreakBadge.test.tsx` covers: (see Testing section)

**Testing:**
- Test streak greater than zero shows flame and count
- Test streak zero shows start text

Write ONLY these tests.

---

## Story 1.10 — WeeklyProgress Component

**Depends on:** Story 1.2

**Files to create:**
- `src/components/WeeklyProgress.tsx`
- `src/components/WeeklyProgress.test.tsx`

**Acceptance Criteria:**
- `WeeklyProgress({ hits, target }: { hits: number; target: number })` is the sole export; server component.
- Renders a progress bar (a `div` with `data-testid="progress-bar"`) whose width is `Math.min(hits / target, 1) * 100` percent.
- Renders hit count label: `"{hits} / {target} days this week"`.
- When `hits >= target`, applies a green accent class `"bg-green-500"`; otherwise `"bg-blue-500"`.
- `WeeklyProgress.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders hit and target label
- Test progress bar width at half target
- Test green class when hits meet target

Write ONLY these tests.

---

## Story 1.11 — CheckInCard Component

**Depends on:** Story 1.7, Story 1.8, Story 1.9

**Files to create:**
- `src/components/CheckInCard.tsx`
- `src/components/CheckInCard.test.tsx`

**Acceptance Criteria:**
- `"use client"` component.
- Props: `{ lane: { id: string; name: string; emoji: string }, streak: number, checkedIn: boolean, isRest: boolean, today: string /* ISO date string */ }`.
- Renders lane emoji + name + `StreakBadge` (receiving `streak` prop).
- Three buttons: **Hit** (calls `createCheckIn({ laneId: lane.id, date: new Date(today), isRest: false })`), **Rest** (calls `createCheckIn({ laneId: lane.id, date: new Date(today), isRest: true })`), **Undo** (calls `deleteCheckIn(lane.id, new Date(today))`; only rendered when `checkedIn === true`).
- Hit and Rest buttons are disabled when `checkedIn === true`.
- Effort-framed button labels: "I showed up", "Rest day", "Undo".
- `CheckInCard.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders lane name and emoji
- Test hit button calls createCheckIn with isRest false
- Test rest button calls createCheckIn with isRest true
- Test undo button renders only when checkedIn true
- Test hit and rest buttons disabled when checkedIn true

Write ONLY these tests.

---

## Story 1.12 — LaneForm Component

**Depends on:** Story 1.5

**Files to create:**
- `src/components/LaneForm.tsx`
- `src/components/LaneForm.test.tsx`

**Acceptance Criteria:**
- `"use client"` component.
- Props: `{ onSubmit?: () => void }`.
- Renders controlled inputs for: `name` (text), `emoji` (text, default `"🥍"`), `targetPerWeek` (number 1–7, default 5).
- On submit: calls `createLane({ name, emoji, targetPerWeek })` and clears the form; calls `onSubmit?.()` on success.
- Whitespace-only name is rejected client-side before calling the action (shows inline error `"Name is required"`).
- `LaneForm.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders name input
- Test empty name submit shows validation error without calling action
- Test valid submit calls createLane and clears form

Write ONLY these tests.

---

## Story 1.13 — LaneList Component

**Depends on:** Story 1.6

**Files to create:**
- `src/components/LaneList.tsx`
- `src/components/LaneList.test.tsx`

**Acceptance Criteria:**
- Server component (no `"use client"`).
- Props: `{ lanes: { id: string; name: string; emoji: string; isActive: boolean; targetPerWeek: number }[] }`.
- Renders an ordered list; each item shows lane emoji + name + active badge + toggle button.
- Toggle button (calls `updateLane(lane.id, { isActive: !lane.isActive })`) is rendered as a `<form>` with a submit button (server action via `action` prop) so it works without JS.
- `LaneList.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders all lanes
- Test active lane shows active badge
- Test inactive lane shows inactive badge

Write ONLY these tests.

---

## Story 1.14 — Daily Dashboard Page

**Depends on:** Story 1.11, Story 1.10

**Files to create:**
- (none — all components already exist)

**Files to modify:**
- `src/app/page.tsx`

**Acceptance Criteria:**
- Exports `export const dynamic = 'force-dynamic'`.
- Fetches all active lanes with today's check-in via `prisma.lane.findMany({ where: { isActive: true }, include: { checkIns: { where: { date: todayUTC } } } })`.
- `todayUTC` is the start of today's UTC day computed via `date-fns` `startOfDay(new Date())`.
- For each lane renders `CheckInCard` (with `checkedIn`, `streak` computed via `computeStreak`, `today` as ISO string) and `WeeklyProgress` (with weekly hits counted from this week's checkIns).
- Page heading: `"Today's Grind 🥍"` — no deficit language.
- No data = shows `"No active lanes yet. Add some on the Lanes page."`.
- Uses `export const dynamic = 'force-dynamic'` so Prisma has a DB URL at runtime.

---

## Story 1.15 — Lane Management Page

**Depends on:** Story 1.12, Story 1.13

**Files to create:**
- `src/app/lanes/page.tsx`

**Acceptance Criteria:**
- Exports `export const dynamic = 'force-dynamic'`.
- Fetches all lanes (active + inactive) via `prisma.lane.findMany({ orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }] })`.
- Renders `LaneList` with all lanes.
- Renders `LaneForm` below the list.
- Page heading: `"Your Training Lanes"`.
