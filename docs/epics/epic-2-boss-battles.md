# Epic 2 — Boss Battles

*Every 2 weeks per lane: Eddie describes how the skill test went; AI returns an effort-framed coach note.*

---

## Story 2.1 — createBossBattle Action

**Depends on:** Story 1.4, Story 3.1

**Files to create:**
- `src/app/actions/createBossBattle.ts`
- `src/app/actions/createBossBattle.test.ts`

**Acceptance Criteria:**
- `createBossBattle(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the sole export.
- Validates `input` with `bossBattleSchema`; returns `{ ok: false, error: 'validation' }` without DB call on failure.
- On success: calls `generate(prompt)` where `prompt` is: `"You are an effort-focused lacrosse coach. Eddie just described his boss battle: \"${selfReport}\". Write a 2-3 sentence coach note that is process-focused, never mentions performance grades, and encourages consistency. No 'great job' filler."`.
- Calls `prisma.bossBattle.upsert({ where: { laneId_weekStarting: { laneId, weekStarting } }, update: { selfReport, coachNote }, create: { ...parsed, coachNote } })`.
- Calls `revalidatePath('/boss-battles')` after success.
- `coachNote` is the string returned by `generate()`; if `generate()` throws, re-throws (caller handles).
- Implement `createBossBattle` exactly once; do NOT emit an alternate variant.
- `createBossBattle.test.ts` covers: (see Testing section)

**Testing:**
- Test valid input calls generate and upserts with coachNote
- Test empty selfReport returns validation error without generate or db call
- Test generate result stored as coachNote in upsert

Write ONLY these tests.

---

## Story 2.2 — BossBattleForm Component

**Depends on:** Story 2.1

**Files to create:**
- `src/components/BossBattleForm.tsx`
- `src/components/BossBattleForm.test.tsx`

**Acceptance Criteria:**
- `"use client"` component.
- Props: `{ laneId: string; laneName: string; weekStarting: Date; existingReport?: string; existingCoachNote?: string }`.
- Renders a `<textarea>` (controlled, `data-testid="self-report-input"`) for Eddie's self-report.
- Submit button label: `"Submit Battle Report"`.
- On submit: calls `createBossBattle({ laneId, weekStarting, selfReport: textareaValue })`.
- While pending (React 19 `useTransition`): disables submit button, shows `"Sending..."`.
- After success: displays the returned coach note in a `<div data-testid="coach-note">` prefixed with `"🧠 Coach says:"`.
- If `existingReport` is provided, seeds the textarea with it and shows existing `existingCoachNote` in `data-testid="coach-note"` on mount.
- Whitespace-only textarea is rejected client-side: shows `"Tell me how it went first"` before calling action.
- `BossBattleForm.test.tsx` covers: (see Testing section)

**Testing:**
- Test renders textarea and submit button
- Test empty submit shows validation message without calling action
- Test valid submit calls createBossBattle and shows coach note

Write ONLY these tests.

---

## Story 2.3 — Boss Battle Hub Page

**Depends on:** Story 2.2, Story 1.2

**Files to create:**
- `src/app/boss-battles/page.tsx`

**Acceptance Criteria:**
- Exports `export const dynamic = 'force-dynamic'`.
- Computes `currentBlockStart = get2WeekBlockStart(new Date())` using `weekUtils`.
- Fetches all active lanes with their boss battle for the current 2-week block:
  `prisma.lane.findMany({ where: { isActive: true }, include: { bossBattles: { where: { weekStarting: currentBlockStart } } } })`.
- For each lane renders: lane emoji + name, `BossBattleForm` seeded with any existing report/coach note.
- Page heading: `"Boss Battles 🏆"`.
- Subheading shows current block label: `get2WeekBlockStart` formatted as `"2-week block starting {Mon DD MMM}"`.
- No active lanes = shows `"Activate lanes on the Lanes page to start boss battles."`.
