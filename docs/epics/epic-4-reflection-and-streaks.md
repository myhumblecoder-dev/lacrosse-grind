# Epic 4 — Reflection & Streaks

*Weekly reflection, AI coach summary, streak freeze tokens, check-in history heatmap, and root layout nav.*

---

## Story 4.1 — createReflection Action

**Depends on:** Story 1.4, Story 3.1

**Files to create:**
- `src/app/actions/createReflection.ts`
- `src/app/actions/createReflection.test.ts`

**Acceptance Criteria:**
- `createReflection(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the sole export.
- Validates with `reflectionSchema`; returns `{ ok: false, error: 'validation' }` without DB call on failure.
- Builds prompt: `"You are an effort-focused lacrosse coach. Eddie's weekly reflection: \"${playerNote}\". Write a 2-3 sentence summary that celebrates consistency and process, never grades performance, and gently encourages next week. Keep it warm and short."`.
- Calls `generate(prompt)` to get `coachSummary`.
- Calls `prisma.weeklyReflection.upsert({ where: { weekStarting }, update: { playerNote, coachSummary }, create: { ...parsed, coachSummary } })`.
- Calls `revalidatePath('/reflection')` after success.
- If `generate()` throws, re-throws (caller handles).
- Implement `createReflection` exactly once; do NOT emit an alternate variant.
- `createReflection.test.ts` covers: (see Testing section)

**Testing:**
- Test valid input calls generate and upserts with coachSummary
- Test empty playerNote returns validation error without generate or db call
- Test generate result stored as coachSummary

Write ONLY these tests.

---

## Story 4.2 — ReflectionForm Component

**Depends on:** Story 4.1

**Files to create:**
- `src/components/ReflectionForm.tsx`
- `src/components/ReflectionForm.test.tsx`

**Acceptance Criteria:**
- `"use client"` component.
- Props: `{ weekStarting: Date; existingNote?: string; existingCoachSummary?: string }`.
- Renders a `<textarea>` (`data-testid="reflection-input"`, controlled) for Eddie's weekly reflection.
- Submit button label: `"Save Reflection"`.
- On submit: calls `createReflection({ weekStarting, playerNote: textareaValue })`.
- While pending (React 19 `useTransition`): disables submit button, shows `"Saving..."`.
- After success: displays coach summary in `<div data-testid="coach-summary">` prefixed with `"🧠 Coach says:"`.
- Seeds textarea from `existingNote` on mount via `useState(existingNote ?? '')`.
- If `existingCoachSummary` provided, shows it in `data-testid="coach-summary"` on initial render.
- Empty textarea rejected client-side: shows `"Share something about your week"`.
- `ReflectionForm.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders textarea and submit button
- Test empty submit shows validation message without calling action
- Test valid submit calls createReflection and shows coach summary

Write ONLY these tests.

---

## Story 4.3 — Weekly Reflection Page

**Depends on:** Story 4.2, Story 1.2

**Files to create:**
- `src/app/reflection/page.tsx`

**Acceptance Criteria:**
- Exports `export const dynamic = 'force-dynamic'`.
- Computes `weekStart = getWeekStart(new Date())` using `weekUtils`.
- Fetches this week's reflection: `prisma.weeklyReflection.findUnique({ where: { weekStarting: weekStart } })`.
- Renders `ReflectionForm` seeded with any existing `playerNote` and `coachSummary`.
- Page heading: `"Weekly Reflection 📓"`.
- Subheading shows week label from `formatWeekLabel(weekStart)`.

---

## Story 4.4 — awardFreeze Action

**Depends on:** Story 1.1

**Files to create:**
- `src/app/actions/awardFreeze.ts`
- `src/app/actions/awardFreeze.test.ts`

**Acceptance Criteria:**
- `awardFreeze(laneId: string): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the sole export.
- `laneId` must be a non-empty string; returns `{ ok: false, error: 'missing-laneId' }` if blank.
- Calls `prisma.streakFreeze.create({ data: { laneId } })` and returns `{ ok: true, id: freeze.id }`.
- Calls `revalidatePath('/')` after success.
- `awardFreeze.test.ts` covers: (see Testing section)

**Testing:**
- Test valid laneId creates freeze and returns ok
- Test empty laneId returns error without db call
- Test db error propagates as thrown error

Write ONLY these tests.

---

## Story 4.5 — useFreeze Action

**Depends on:** Story 1.1

**Files to create:**
- `src/app/actions/useFreeze.ts`
- `src/app/actions/useFreeze.test.ts`

**Acceptance Criteria:**
- `useFreeze(laneId: string, date: Date): Promise<{ ok: true } | { ok: false; error: string }>` is the sole export.
- Finds an available freeze token: `prisma.streakFreeze.findFirst({ where: { laneId, usedDate: null } })`.
- If none found, returns `{ ok: false, error: 'no-freeze-available' }` without further DB calls.
- If found: updates `prisma.streakFreeze.update({ where: { id: freeze.id }, data: { usedDate: date } })`.
- Calls `revalidatePath('/')` after success.
- `useFreeze.test.ts` covers: (see Testing section)

**Testing:**
- Test available freeze found and marked used
- Test no available freeze returns no-freeze-available error
- Test laneId passed to findFirst correctly

Write ONLY these tests.

---

## Story 4.6 — FreezeBadge Component

**Depends on:** Story 4.4, Story 4.5

**Files to create:**
- `src/components/FreezeBadge.tsx`
- `src/components/FreezeBadge.test.tsx`

**Acceptance Criteria:**
- Server component (no `"use client"`).
- Props: `{ availableFreezes: number }`.
- Renders `❄️` emoji followed by count: `❄️ {availableFreezes}`.
- When `availableFreezes === 0`, renders text `"No freezes"` with muted styling (`text-gray-400`).
- `FreezeBadge.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders freeze count when greater than zero
- Test renders no freezes text when zero

Write ONLY these tests.

---

## Story 4.7 — History Page

**Depends on:** Story 1.2, Story 1.3

**Files to create:**
- `src/app/history/page.tsx`

**Acceptance Criteria:**
- Exports `export const dynamic = 'force-dynamic'`.
- Fetches all active lanes with all their check-ins from the past 30 days:
  `prisma.lane.findMany({ where: { isActive: true }, include: { checkIns: { where: { date: { gte: thirtyDaysAgo } }, orderBy: { date: 'asc' } } } })`.
- `thirtyDaysAgo` computed via `date-fns` `subDays(startOfDay(new Date()), 30)`.
- For each lane renders: lane emoji + name + current streak (from `computeStreak`).
- Renders a simple 30-day calendar grid: 30 cells; each cell is green (`bg-green-400`) if a check-in exists for that date, light grey otherwise. Rest days show blue (`bg-blue-300`).
- Page heading: `"Your Streak History 📅"`.
- `export const dynamic = 'force-dynamic'` required.

---

## Story 4.8 — Root Layout Nav

**Depends on:** Story 1.14, Story 2.3, Story 4.3, Story 4.7

**Files to modify:**
- `src/app/layout.tsx`

**Acceptance Criteria:**
- Adds a bottom nav bar (or top nav) with 4 links: `"Today"` → `/`, `"Lanes"` → `/lanes`, `"Boss Battles"` → `/boss-battles`, `"Reflect"` → `/reflection`.
- Uses Next.js `<Link>` from `next/link`.
- Styled with Tailwind; shadcn primitives where applicable.
- Preserves the existing `<html>`, `<body>`, font, and `globals.css` import from the scaffold.
- Does NOT break the existing layout structure (add nav inside `<body>` alongside `{children}`).
