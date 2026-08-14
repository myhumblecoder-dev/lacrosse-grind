# Epic — Lane Swap Mechanic

*After completing a boss battle on a lane, Eddie can trade it for a new one.*
*Rules: exactly 3 active lanes → must pick a replacement (straight swap); more than 3 active → can retire without picking one. Weeks already qualified stay qualified regardless of swap.*

*Paths drawn from `docs/architecture.md §3`. One concern per story, dependency order: kernel → validation schema mod → action → modal component (A) → modal component (B) → lane-list wire → lanes-page wire → boss-battles-page wire.*

---

## Story 1 — validateSwap kernel (blocked/retire cases)

**Files to create:**
- `src/lib/validateSwap.ts`
- `src/lib/validateSwap.test.ts`

**Acceptance Criteria:**
- `validateSwap(activeLaneCount: number)` is the SOLE export of `src/lib/validateSwap.ts`.
- Imports nothing (pure function, no collaborators).
- When `activeLaneCount < 3`: returns `{ canRetire: false, mustPickReplacement: false, blocked: true }`.
- When `activeLaneCount > 3`: returns `{ canRetire: true, mustPickReplacement: false, blocked: false }`.
- Implement exactly once; do NOT emit an alternate variant or re-export. Omit return-type annotation and let TS infer.

**Testing:**
- Test fewer than 3 lanes is blocked
- Test more than 3 lanes can retire
- Test 4 lanes returns canRetire true

Write ONLY these tests.

---

## Story 2 — validateSwap kernel (exact-3 case)

**Depends on:** Story 1

**Files to modify:**
- `src/lib/validateSwap.ts`
- `src/lib/validateSwap.test.ts`

**Acceptance Criteria:**
- `validateSwap(activeLaneCount: number)` is the SOLE export of `src/lib/validateSwap.ts` (already created in Story 1). Imports nothing.
- Add the branch: when `activeLaneCount === 3`, return `{ canRetire: false, mustPickReplacement: true, blocked: false }`.
- The existing blocked and canRetire cases remain unchanged.
- Implement the new branch exactly once; do NOT emit a new export or alternate variant.

**Testing:**
- Test exactly 3 lanes requires replacement
- Test exactly 3 returns mustPickReplacement true
- Test exactly 3 returns blocked false

Write ONLY these tests.

---

## Story 3 — swapSchema Zod addition

**Files to modify:**
- `src/lib/validation.ts`

**Acceptance Criteria:**
- `src/lib/validation.ts` exports `swapSchema` as a new named export (alongside the pre-existing `laneSchema`, `checkInSchema`, `bossBattleSchema`, `reflectionSchema`, `prizeSchema`).
- `swapSchema` is: `z.object({ outLaneId: z.string().min(1), inLaneId: z.string().min(1).optional() })`.
- `inLaneId` is optional to support the retire-only path (swapping out without picking a replacement).
- All pre-existing schemas remain unchanged. `swapSchema` is the only addition; do NOT emit alternate variants.
- Imports `z` from `zod` (already present in the file).

**Testing:**
- Test outLaneId required
- Test inLaneId optional
- Test empty outLaneId rejected

Write ONLY these tests.

---

## Story 4 — swapLane action (retire path)

**Depends on:** Story 1, Story 2, Story 3

**Files to create:**
- `src/app/actions/swapLane.ts`
- `src/app/actions/swapLane.test.ts`

**Acceptance Criteria:**
- `swapLane(input: unknown)` is the SOLE export of `src/app/actions/swapLane.ts`.
- Imports `swapSchema` from `@/lib/validation`, `validateSwap` from `@/lib/validateSwap`, `prisma` from `@/lib/db`, `revalidatePath` from `next/cache`.
- Parse `input` with `swapSchema.safeParse`; if invalid return `{ ok: false, error: "validation" }`.
- Count active lanes: `await prisma.lane.count({ where: { isActive: true } })`.
- Call `validateSwap(activeLaneCount)`; if `result.blocked`, return `{ ok: false, error: "blocked" }`.
- Retire path (no inLaneId): deactivate `outLaneId` via `prisma.lane.update({ where: { id: outLaneId }, data: { isActive: false } })`. Then `revalidatePath("/lanes")` and `revalidatePath("/")`. Return `{ ok: true }`.
- Check-in and BossBattle rows for `outLaneId` are NOT deleted — they remain as historical records.
- Implement `swapLane` exactly once; omit return-type annotation.

**Testing:**
- Test returns blocked error when fewer than 3 active lanes
- Test returns validation error on empty input
- Test retire path deactivates outLaneId when more than 3 lanes

Write ONLY these tests.

---

## Story 5 — swapLane action (swap path)

**Depends on:** Story 4

**Files to modify:**
- `src/app/actions/swapLane.ts`
- `src/app/actions/swapLane.test.ts`

**Acceptance Criteria:**
- `swapLane(input: unknown)` is the SOLE export of `src/app/actions/swapLane.ts` (already created in Story 4). Imports `swapSchema` from `@/lib/validation`, `validateSwap` from `@/lib/validateSwap`, `prisma` from `@/lib/db`, `revalidatePath` from `next/cache`.
- Extend `swapLane` to handle the swap path: when `validateSwap` result has `mustPickReplacement: true` and `parsed.data.inLaneId` is absent, return `{ ok: false, error: "replacement-required" }`.
- When `inLaneId` is present, run a `prisma.$transaction`: deactivate `outLaneId` (`prisma.lane.update({ where: { id: outLaneId }, data: { isActive: false } })`), then activate `inLaneId` (`prisma.lane.update({ where: { id: inLaneId }, data: { isActive: true } })`).
- After the transaction: `revalidatePath("/lanes")` and `revalidatePath("/")`. Return `{ ok: true }`.
- No new export is added; the existing `swapLane` export is modified. Do NOT emit an alternate variant.

**Testing:**
- Test replacement-required when 3 lanes and no inLaneId
- Test swap deactivates out and activates in
- Test swap calls transaction with both updates

Write ONLY these tests.

---

## Story 6 — LaneSwapModal component (display and cancel)

**Depends on:** Story 1

**Files to create:**
- `src/components/LaneSwapModal.tsx`
- `src/components/LaneSwapModal.test.tsx`

**Acceptance Criteria:**
- Default-exports a component named `LaneSwapModal`.
- `"use client"` directive at the top.
- Props: `open: boolean`, `outLane: { id: string; name: string; emoji: string }`, `inactiveLanes: { id: string; name: string; emoji: string }[]`, `mustPickReplacement: boolean`, `canRetire: boolean`, `onSwap: (outLaneId: string, inLaneId?: string) => Promise<void>`, `onCancel: () => void`.
- When `open` is false, the component returns null and renders nothing.
- When `open` is true, renders an element with `role="dialog"` and `aria-modal="true"`.
- Heading text is the string `"Trade out "` followed by `outLane.emoji` and `outLane.name` — for a lane `{ emoji: "🥍", name: "Stick Skills" }`, the heading renders `"Trade out 🥍 Stick Skills"`.
- A button with `data-testid="cancel-swap"` calls `onCancel` when clicked.
- When `mustPickReplacement` is true and `inactiveLanes` is empty, renders a `<p>` element containing the literal text `"No inactive lanes available"`.

**Testing:**
- Test renders nothing when closed
- Test renders dialog heading when open
- Test cancel button calls onCancel

Write ONLY these tests.

---

## Story 7 — LaneSwapModal component (confirm flow)

**Depends on:** Story 6

**Files to modify:**
- `src/components/LaneSwapModal.tsx`
- `src/components/LaneSwapModal.test.tsx`

**Acceptance Criteria:**
- `LaneSwapModal` is the default export (already created in Story 6). No new exports are added.
- When `mustPickReplacement` is true and `inactiveLanes` is non-empty: renders a `<select>` with `data-testid="replacement-select"`. Each inactive lane is `<option value={lane.id}>{lane.emoji} {lane.name}</option>`. A placeholder `<option value="">Pick a replacement lane</option>` is first.
- A button with `data-testid="confirm-swap"` is rendered. When `mustPickReplacement` is true and selected value is empty-string, `confirm-swap` has `disabled` attribute.
- When `canRetire` is true and `mustPickReplacement` is false: `confirm-swap` calls `onSwap(outLane.id)` with no second argument.
- When `mustPickReplacement` is true and a lane is selected: `confirm-swap` calls `onSwap(outLane.id, selectedInLaneId)`.
- Uses `useTransition` for `isPending`; `confirm-swap` is disabled while `isPending`.
- Do NOT emit an alternate variant.

**Testing:**
- Test confirm disabled when no replacement selected
- Test confirm calls onSwap with selected id
- Test retire confirm calls onSwap with no second arg

Write ONLY these tests.

---

## Story 8 — LaneList wire: add swap props and button

**Depends on:** Story 6, Story 7

**Files to modify:**
- `src/components/LaneList.tsx`
- `src/components/LaneList.test.tsx`

**Acceptance Criteria:**
- `LaneList` is a default export named `LaneList`; it remains a `"use client"` component.
- Imports `LaneSwapModal` from `@/components/LaneSwapModal`.
- Add three new props to `LaneList`: `onSwapLane: (outLaneId: string, inLaneId?: string) => Promise<unknown>`, `swapState: { mustPickReplacement: boolean; canRetire: boolean; blocked: boolean }`, `inactiveLanes: { id: string; name: string; emoji: string }[]`.
- Each active lane row shows a "Swap" button with `data-testid="swap-btn-{lane.id}"` when `!swapState.blocked`.
- Clicking the "Swap" button sets state to open `LaneSwapModal` for that lane (one modal shared across lanes, driven by `useState<Lane | null>`).
- On modal confirm, calls `onSwapLane(outLaneId, inLaneId?)` then closes the modal.
- Pre-existing props (`updateLane`, `setActive`, `deleteLane`) and their buttons remain unchanged.

**Testing:**
- Test swap button renders when swap not blocked
- Test swap button absent when blocked
- Test clicking swap button opens modal for correct lane

Write ONLY these tests.

---

## Story 9 — lanes/page.tsx wire: pass swap props

**Depends on:** Story 4, Story 5, Story 8

**Files to modify:**
- `src/app/lanes/page.tsx`

**Acceptance Criteria:**
- `src/app/lanes/page.tsx` imports `swapLane` from `@/app/actions/swapLane` and `validateSwap` from `@/lib/validateSwap`.
- After fetching lanes, computes `activeLaneCount = lanes.filter((l: { isActive: boolean }) => l.isActive).length`.
- Calls `validateSwap(activeLaneCount)` and stores result as `swapState`.
- Computes `inactiveLanes = lanes.filter((l: { isActive: boolean; id: string; name: string; emoji: string }) => !l.isActive).map(...)` with only `id`, `name`, `emoji` fields.
- Passes `swapState`, `inactiveLanes`, and a server-action-wrapped `onSwapLane` to `<LaneList>`.
- `export const dynamic = "force-dynamic"` is preserved.

**Testing:**
- Test active lanes count drives swapState mustPickReplacement when count is 3
- Test inactive lanes passed to LaneList

Write ONLY these tests.

---

## Story 10 — boss-battles/page.tsx wire: swap after boss victory

**Depends on:** Story 4, Story 5, Story 6, Story 7

**Files to modify:**
- `src/app/boss-battles/page.tsx`

**Acceptance Criteria:**
- `src/app/boss-battles/page.tsx` imports `swapLane` from `@/app/actions/swapLane`, `validateSwap` from `@/lib/validateSwap`, and `LaneSwapModal` from `@/components/LaneSwapModal`.
- After fetching active lanes (existing query), adds a second Prisma query: `const inactiveLanes = await prisma.lane.findMany({ where: { isActive: false }, select: { id: true, name: true, emoji: true } })`.
- Computes `activeLaneCount = lanes.length` and calls `validateSwap(activeLaneCount)`.
- Defines `BossBattleSwapTrigger` as a named `"use client"` component inline in the same file (above the default export). Props: `{ lane: { id: string; name: string; emoji: string }, inactiveLanes: { id: string; name: string; emoji: string }[], swapState: { mustPickReplacement: boolean; canRetire: boolean; blocked: boolean }, onSwapLane: (outLaneId: string, inLaneId?: string) => Promise<unknown> }`. It renders a "Trade this lane" button with `data-testid="trade-btn-{lane.id}"` that opens `LaneSwapModal`. When `swapState.blocked` is true, renders nothing.
- For each lane section where `hitTarget && existing` (boss battle submitted), renders `<BossBattleSwapTrigger>` below the boss battle form, passing `lane`, `inactiveLanes`, `swapState`, and a server-action-wrapped `onSwapLane`.
- `export const dynamic = "force-dynamic"` is preserved.

**Testing:**
- Test BossBattleSwapTrigger renders trade button when not blocked
- Test BossBattleSwapTrigger renders nothing when blocked
- Test BossBattleSwapTrigger opens modal on click

Write ONLY these tests.
