# Epic 8 — Witness Amendments

A parent who watched the training happen can put it on the record, and a parent
who knows it did not happen can take it off. Amendments reach back only across
the current week, are gated by a passphrase the parent sets, and are recorded as
what they are — a witness statement, not a tap the player made.

---

## Why this shape

**The app has no parent.** `User` is the Google account; `Player` is the kid
(`src/lib/viewer.ts`, `src/lib/tenancy.ts`). The kid trains on the parent's
session, so nothing in the data model can tell the two apart.

The passphrase is therefore **friction and attribution, not a boundary.** Whoever
holds the unlocked device holds the session, so they can replace the passphrase
from `/account` and attest whatever they like — and that is accepted, because
requiring the current one would lock a parent out permanently the first time they
forget it, with no recovery short of deleting the account.

What it buys instead: amending is a deliberate act rather than a tap, and
`attestedAt` makes every amendment attributable after the fact. History rings an
attested day, so a parent sees any attestation they did not make. **The posture is
detection, not prevention.** Prevention would need a real second factor — an
emailed reset, or re-authenticating with Google immediately before the change —
and that is its own piece of work, not part of this epic.

**The window is the current week, both directions.** `src/lib/checkInWindow.ts`
names the fear it exists for — *"a season can be fabricated wholesale by
back-dating."* Monday-to-today caps fabrication at one week, and it means an
already-earned qualified week can never be revoked by a withdrawal, which is the
same rule `LaneTarget` was built to hold (`prisma/schema.prisma` §LaneTarget).

**The control is a button on History that opens its own page.** The button is
there because the place a parent notices a wrong week is the grid they are
already looking at; the page is separate because History is Eddie's record, not
an admin console — "only days you showed up are here" is the page's own framing,
and a passphrase field does not belong in it.

The split also pays for itself three times over. The window is current-week-only,
so this week's row plus a parent's memory is the whole of the context needed —
thirteen weeks of season grid adds nothing to the decision. History's day squares
are `h-6 w-6`, far too small to tap with confidence, so an inline grid would mean
a second, larger rendering of the same week stacked under the small one. And
`buildWeekRecaps` emits no section at all for a week with no check-ins, which is
exactly the week most likely to need amending — a dedicated page has no such
blind spot, because `buildAmendWeek` always emits Monday through today.

**Scoring needs no new machinery.** `getWeekStatuses` → `isQualifyingWeek`
recompute from check-in rows on every render, so an amendment repairs or
un-repairs the live week the moment it lands. Boss battles are untouched:
`completedAt` and the `defeats` count that drives avatar level never unwind.

**A withdrawal deletes the row and logs the deletion.** The alternative — a
`withdrawnAt` flag on `CheckIn` — would force a `withdrawnAt: null` filter into
every reader (`page.tsx`, `history/page.tsx`, `weekRecap`, `streak`,
`qualifyingWeek`, `demoSeason`, `boss-battles`, `prize`), and one missed filter
would silently score a withdrawn day. Deleting keeps `@@unique([laneId, date])`
meaningful and needs no reader changes. The log is read by `/amend` only:
History shows the day as blank rather than carrying a struck square across a
thirteen-week grid.

**Copy stays effort-framed** (FR-7, architecture §4). An amendment is "I was
there" or "this one didn't happen" — never a correction, never a deficit, and
never a streak-loss animation.

---

## Story 8.1 — Schema: witness passphrase, attestation fields, removal log

Add the witness passphrase column to `User`, attestation columns to `CheckIn`,
and the new `CheckInRemoval` model. Every addition is nullable or defaulted so
`prisma db push` is additive — no data loss and no migration backfill.

**Files to modify:**
- `prisma/schema.prisma`

**Acceptance Criteria:**
- `User` gains `witnessHash String?` — the scrypt `"salt:hash"` string, null when no passphrase has ever been set. No other `User` field changes.
- `CheckIn` gains `attestedAt DateTime?` (null = the player tapped it; set = a witness attested it) and `attestedNote String?`. The existing `note` field is left alone — `attestedNote` is the witness's words, `note` is the player's.
- New model `CheckInRemoval` with fields: `id String @id @default(cuid())`, `laneId String`, `lane Lane @relation(fields: [laneId], references: [id], onDelete: Cascade)`, `date DateTime`, `wasRest Boolean @default(false)`, `note String?`, `createdAt DateTime @default(now())`.
- `CheckInRemoval` has `@@index([laneId, date])` and NO unique constraint on `([laneId, date])` — it is an append-only log, so a day marked and withdrawn twice writes two rows.
- `Lane` gains the reverse relation `removals CheckInRemoval[]`. No other `Lane` field changes.
- Every other model and field in the file is preserved unchanged.
- A comment above `CheckInRemoval` states why withdrawal deletes the `CheckIn` row and logs it here rather than soft-deleting in place.

**Deployment note:** no manual push is needed. `.github/workflows/cd.yml` runs
`prisma db push --accept-data-loss` against the production `DATABASE_URL` on
every push to `main`, BEFORE `vercel build` and `vercel deploy` — so the columns
land ahead of the code that reads them, and schema and app always move together.
`vercel-build` deliberately does NOT push (reverted in `c619163`: a build must
not mutate a database). What this does mean: these columns do not exist in
production until the release PR merges to `main`, so Stories 8.8 and 8.9 cannot
be exercised against prod before that merge.

**Testing:** not applicable — Prisma schema file; there is no unit under test.

---

## Story 8.2 — Architecture doc: data model and file inventory

Update `docs/architecture.md` §2 for the schema changes from Story 8.1 and §3
for every path this epic introduces. Stories draw their paths from §3, so this
lands before any code story.

**Files to modify:**
- `docs/architecture.md`

**Acceptance Criteria:**
- §2 documents `User.witnessHash`, `CheckIn.attestedAt`, `CheckIn.attestedNote`, and the full `CheckInRemoval` Prisma block as specified in Story 8.1.
- §3 file inventory gains rows for: `src/lib/witnessPassphrase.ts`, `src/lib/amendWindow.ts`, `src/lib/amendWeek.ts`, `src/app/actions/setWitnessPassphrase.ts`, `src/app/actions/attestCheckIn.ts`, `src/app/actions/withdrawCheckIn.ts`, `src/components/WitnessPassphrasePanel.tsx`, `src/components/AmendWeekGrid.tsx`, `src/app/amend/page.tsx`.
- The existing `src/app/actions/deleteCheckIn.ts` row's purpose text is updated to note it is bounded to the check-in window and scoped to the active player.
- §4 conventions and §5 data flow gain an entry showing the amendment path: `AmendWeekGrid ("use client") ──attestCheckIn/withdrawCheckIn──▶ actions`.
- No other sections of `docs/architecture.md` are altered.

**Testing:** not applicable — documentation file; there is no unit under test.

---

## Story 8.3 — witnessPassphrase lib: hash and verify

A pure crypto helper over Node's `crypto`. No new dependency: `scryptSync` plus
`timingSafeEqual` is all this needs, and adding bcrypt for one column would be
the larger change.

**Files to create:**
- `src/lib/witnessPassphrase.ts`
- `src/lib/witnessPassphrase.test.ts`

**Acceptance Criteria:**
- Exports `hashWitnessPassphrase(plain: string): string` and `verifyWitnessPassphrase(plain: string, stored: string | null | undefined): boolean`. Each is implemented exactly once.
- Does NOT export the minimum length. That is a validation rule, and it lives in `src/lib/validation.ts` (Story 8.6) so nothing has to import this module to learn it — see the dependency-direction note below.
- Imports `{ randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'` — prefixed, because the Vitest environment is `jsdom` and the bare specifier is ambiguous there.
- Imports nothing from `@/lib/db`, `@/lib/tenancy`, `@/lib/validation`, or `next/*` — this file must stay importable by an action without pulling in request context, and must never be reachable from a client component.
- `hashWitnessPassphrase` generates a fresh `randomBytes(16).toString('hex')` salt per call, derives `scryptSync(plain, salt, 64).toString('hex')`, and returns `` `${salt}:${derived}` ``. Two calls with the same input return different strings.
- `verifyWitnessPassphrase` returns `false` when `stored` is null, undefined, empty, or does not split into exactly two non-empty parts on `':'` — a malformed column is a refusal, never a throw.
- `verifyWitnessPassphrase` re-derives with the stored salt and compares via `timingSafeEqual` on equal-length Buffers. It checks the two Buffers' lengths first and returns `false` on mismatch, because `timingSafeEqual` throws on unequal lengths.
- Test file mocks nothing — this is pure and runs for real.

**Dependency direction:** `validation.ts` must NOT import this module. Nothing
client-side imports `@/lib/validation` today (only six server files do), but a
single client form importing `laneSchema` would then pull `node:crypto` into the
browser bundle and break the build. Keeping the constant in `validation.ts` and
the crypto here means that arrow can never point the wrong way.

**Testing:**
- Test hash of the same passphrase twice produces two different strings
- Test verify returns true for the passphrase that was hashed
- Test verify returns false for a different passphrase
- Test verify returns false for null stored value
- Test verify returns false for a stored value with no colon separator

---

## Story 8.4 — amendWindow lib: how far back an amendment reaches

A pure predicate, the amendment counterpart to `isWithinCheckInWindow`. Three
floors, not one: the week's Monday, the lane's `startsOn`, and the season start.
A lane still pending this week must not be amendable into a week it is not
scored for (`src/lib/lanePending.ts`), and no day may land before the season
existed.

**Files to create:**
- `src/lib/amendWindow.ts`
- `src/lib/amendWindow.test.ts`

**Acceptance Criteria:**
- `isWithinAmendWindow(date: Date, today: Date, floors?: { laneStartsOn?: Date | null; seasonStart?: Date | null }): boolean` is the SOLE export.
- Imports `{ getWeekStart } from '@/lib/weekUtils'`. Imports nothing from `@/lib/db` or `next/*`.
- Every comparison is at UTC midnight via a local `dayKey` helper of the same shape used in `src/lib/streak.ts`, so a caller passing `getTrainingDay(new Date())` compares correctly under any `TZ`.
- Returns `false` when `date` is after `today` — a day that has not happened cannot have been trained.
- Returns `false` when `date` is before `getWeekStart(today)`.
- Returns `false` when `floors.laneStartsOn` is set and `date` is before it.
- Returns `false` when `floors.seasonStart` is set and `date` is before it.
- Returns `true` otherwise, including for `today` itself and for `getWeekStart(today)` itself (both bounds inclusive).
- A null or undefined floor is ignored, matching `isLanePending`'s treatment of a missing `startsOn`.
- A comment states why the window is the current week rather than the whole season, citing the fabrication risk named in `src/lib/checkInWindow.ts` and the already-earned-week rule from `LaneTarget`.

**Testing:**
- Test returns true for today
- Test returns true for the Monday of today's week
- Test returns false for the Sunday before this week
- Test returns false for tomorrow
- Test returns false when laneStartsOn is after the asked day
- Test returns false when seasonStart is after the asked day
- Test ignores null floors

---

## Story 8.5 — amendWeek lib: build the current-week grid

A pure builder for the `/amend` grid. `buildWeekRecaps` cannot serve here: it
emits only days that *have* a check-in, and the amendment grid needs the empty
slots — those are the whole point.

**Files to create:**
- `src/lib/amendWeek.ts`
- `src/lib/amendWeek.test.ts`

**Acceptance Criteria:**
- Exports type `AmendDayState = 'session' | 'rest' | 'withdrawn' | 'empty'`, interfaces `AmendDay { date: Date; state: AmendDayState; attested: boolean; amendable: boolean }` and `AmendLaneWeek { id: string; name: string; emoji: string; days: AmendDay[] }`, and `buildAmendWeek(lanes: AmendLaneInput[], today: Date, seasonStart: Date | null): AmendLaneWeek[]`.
- `AmendLaneInput` is `{ id: string; name: string; emoji: string; startsOn: Date | null; checkIns: { date: Date; isRest: boolean; attestedAt: Date | null }[]; removals: { date: Date }[] }`.
- Imports `{ getWeekStart } from '@/lib/weekUtils'` and `{ isWithinAmendWindow } from '@/lib/amendWindow'`. Imports nothing from `@/lib/db`.
- `days` runs from `getWeekStart(today)` through `today` inclusive — so three entries on a Wednesday, seven on a Sunday. Never a future day.
- State resolution per day, in this precedence: a matching check-in with `isRest: true` → `'rest'`; a matching check-in with `isRest: false` → `'session'`; otherwise a matching removal → `'withdrawn'`; otherwise `'empty'`. A live check-in beats a removal so a day withdrawn and then re-attested reads as trained, not withdrawn.
- `attested` is `true` only when the matching check-in's `attestedAt` is non-null.
- `amendable` is `isWithinAmendWindow(day, today, { laneStartsOn: lane.startsOn, seasonStart })`.
- All date matching is at UTC midnight.
- Lane order is preserved from the input — the page sorts, this does not.

**Testing:**
- Test emits three days on a Wednesday and seven on a Sunday
- Test a day with a non-rest check-in reads session
- Test a day with a rest check-in reads rest
- Test a day with only a removal reads withdrawn
- Test a day with both a check-in and a removal reads session
- Test a day with neither reads empty
- Test attested is true only when attestedAt is set
- Test amendable is false for days before a lane's startsOn

---

## Story 8.6 — Validation schemas for the amendment actions

Add the Zod schemas the three new actions validate against. Architecture §4
requires every action to validate with a schema from this file before any DB
call.

**Files to modify:**
- `src/lib/validation.ts`
- `src/lib/validation.test.ts`

**Acceptance Criteria:**
- Adds `export const MIN_WITNESS_PASSPHRASE_LENGTH = 6` to this file, and `witnessPassphraseSchema = z.string().min(MIN_WITNESS_PASSPHRASE_LENGTH).max(200)`. The schema is NOT `.trim()`ed — a leading or trailing space a parent chose on purpose must survive the round trip.
- This file does NOT import `@/lib/witnessPassphrase`. The constant lives here precisely so the crypto module stays unreachable from anything a client component might import (see Story 8.3).
- Adds `attestCheckInSchema = z.object({ laneId: z.string().min(1), date: z.date(), isRest: z.boolean().default(false), note: z.string().trim().max(200).optional().nullable(), passphrase: z.string().min(1) })`.
- Adds `withdrawCheckInSchema = z.object({ laneId: z.string().min(1), date: z.date(), note: z.string().trim().max(200).optional().nullable(), passphrase: z.string().min(1) })`.
- Adds the inferred type exports `AttestCheckInInput` and `WithdrawCheckInInput` alongside the existing ones.
- The `passphrase` field is `min(1)` rather than the full `witnessPassphraseSchema`: a wrong-length guess must come back as a failed verification, not as a validation error that tells the guesser the length is wrong.
- Every existing schema and type export in the file is unchanged.

**Testing:**
- Test attestCheckInSchema rejects a missing passphrase
- Test attestCheckInSchema defaults isRest to false
- Test withdrawCheckInSchema rejects a missing laneId
- Test witnessPassphraseSchema rejects a passphrase below the minimum length

---

## Story 8.7 — setWitnessPassphrase action

**Depends on:** Story 8.1, Story 8.3, Story 8.6

Sets or replaces the account's witness passphrase. Requires the Google session
only — no old passphrase. The passphrase exists to stop a kid on an unlocked
device, and the signed-in account owner is already past that line; a recovery
flow on top of it would be theatre.

**Files to create:**
- `src/app/actions/setWitnessPassphrase.ts`
- `src/app/actions/setWitnessPassphrase.test.ts`

**Acceptance Criteria:**
- `setWitnessPassphrase(passphrase: unknown): Promise<{ ok: true } | { ok: false; error: string }>` is the SOLE export.
- Imports `{ prisma } from '@/lib/db'`, `{ requireUserId } from '@/lib/tenancy'`, `{ witnessPassphraseSchema } from '@/lib/validation'`, `{ hashWitnessPassphrase } from '@/lib/witnessPassphrase'`, `{ revalidatePath } from 'next/cache'`.
- No `'use server'` directive in the file — `src/app/account/page.tsx` wraps it in an inline `"use server"` closure, matching how that page already wraps `deleteAccount`.
- Calls `requireUserId()` first, then `witnessPassphraseSchema.safeParse(passphrase)`; on failure returns `{ ok: false, error: 'validation' }` before any DB call.
- On success calls `prisma.user.update({ where: { id: userId }, data: { witnessHash: hashWitnessPassphrase(parsed.data) } })`, then `revalidatePath('/account')`, then returns `{ ok: true }`.
- The plaintext passphrase is never logged and never returned.
- Test file mocks `@/lib/db`, `@/lib/tenancy`, and `next/cache`. It does NOT mock `@/lib/witnessPassphrase` — the real hash runs, and the test asserts the written value contains a `':'` and is not the plaintext.
- Mock assertions use short separate lines: `expect(mock.user.update).toHaveBeenCalledOnce(); const arg = mock.user.update.mock.calls[0][0]; expect(arg.where).toEqual({ id: 'u1' }); expect(arg.data.witnessHash).not.toBe('hunter2')`.

**Testing:**
- Test returns validation error for a too-short passphrase
- Test does not call user.update when validation fails
- Test writes a hashed value that is not the plaintext
- Test revalidates /account on success

---

## Story 8.8 — attestCheckIn action

**Depends on:** Story 8.1, Story 8.3, Story 8.4, Story 8.6

Puts a past day of the current week on the record as trained. Upserts the
`CheckIn` with `attestedAt` set, and refunds a freeze token that had been spent
covering that day — the token cost a boss battle, and it turns out it was
covering a day the player actually trained.

**Files to create:**
- `src/app/actions/attestCheckIn.ts`
- `src/app/actions/attestCheckIn.test.ts`

**Acceptance Criteria:**
- `attestCheckIn(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the SOLE export.
- Imports `{ prisma } from '@/lib/db'`, `{ requireUserId, requirePlayerId } from '@/lib/tenancy'`, `{ attestCheckInSchema } from '@/lib/validation'`, `{ verifyWitnessPassphrase } from '@/lib/witnessPassphrase'`, `{ isWithinAmendWindow } from '@/lib/amendWindow'`, `{ getTrainingDay } from '@/lib/trainingDay'`, `{ revalidatePath } from 'next/cache'`.
- No `'use server'` directive — `src/app/amend/page.tsx` wraps it in an inline `"use server"` closure.
- Order of operations, each step returning before the next on failure: `requireUserId()` → `requirePlayerId(userId)` → `attestCheckInSchema.safeParse(input)` (`{ ok: false, error: 'validation' }`) → load the user's `witnessHash` via `prisma.user.findUnique({ where: { id: userId }, select: { witnessHash: true } })` → `{ ok: false, error: 'no-passphrase' }` when it is null → `verifyWitnessPassphrase` → `{ ok: false, error: 'bad-passphrase' }` on failure.
- Then loads the lane scoped to the active player: `prisma.lane.findFirst({ where: { id: laneId, playerId }, select: { id: true, startsOn: true } })`; returns `{ ok: false, error: 'not-found' }` when null. The season floor comes from a separate `prisma.prize.findUnique({ where: { playerId }, select: { seasonStart: true } })` — `Prize.playerId` is unique, so this is the same one-row read the pages already do, rather than a nested array select through `Player.prizes`.
- Then checks `isWithinAmendWindow(date, getTrainingDay(new Date()), { laneStartsOn: lane.startsOn, seasonStart })`; returns `{ ok: false, error: 'outside-window' }` on failure. The window is checked AFTER the passphrase so a wrong guess learns nothing about the data.
- On success: `prisma.checkIn.upsert({ where: { laneId_date: { laneId, date } }, update: { isRest, attestedAt: new Date(), attestedNote: note ?? null }, create: { laneId, date, isRest, attestedAt: new Date(), attestedNote: note ?? null } })`.
- Freeze refund: after the upsert, `prisma.streakFreeze.updateMany({ where: { laneId, usedDate: date }, data: { usedDate: null } })`. `updateMany` rather than `update` because zero matching rows is the normal case and must not throw.
- Then `revalidatePath('/')`, `revalidatePath('/amend')`, and `revalidatePath('/history')`, then returns `{ ok: true, id: row.id }`. All three: the amendment changes the dashboard's weekly counter and streak, the grid it was made from, and the season rows on History.
- Test file mocks `@/lib/db`, `@/lib/tenancy`, `next/cache`, and `@/lib/trainingDay`. It does NOT mock `@/lib/amendWindow` or `@/lib/witnessPassphrase` — the real predicates run, and the test seeds a real hash via `hashWitnessPassphrase`.

**Testing:**
- Test returns validation error for a malformed input
- Test returns no-passphrase when the account has no witnessHash
- Test returns bad-passphrase for a wrong passphrase and does not upsert
- Test returns not-found when the lane belongs to another player
- Test returns outside-window for a day before this week's Monday
- Test upsert is called with attestedAt set for a valid past day this week
- Test refunds a freeze whose usedDate equals the attested day
- Test revalidates /, /amend and /history on success

---

## Story 8.9 — withdrawCheckIn action

**Depends on:** Story 8.1, Story 8.3, Story 8.4, Story 8.6

Takes a day off the record. Deletes the `CheckIn` row and writes a
`CheckInRemoval` in the same transaction, so the record of the withdrawal
survives the row it removed. Does NOT re-spend a freeze token: `FreezeOffer`
will offer one again on the next render if the gap is worth a token, and
`spendFreeze` is the only thing allowed to spend one.

**Files to create:**
- `src/app/actions/withdrawCheckIn.ts`
- `src/app/actions/withdrawCheckIn.test.ts`

**Acceptance Criteria:**
- `withdrawCheckIn(input: unknown): Promise<{ ok: true } | { ok: false; error: string }>` is the SOLE export.
- Imports the same set as Story 8.8 but with `{ withdrawCheckInSchema }`, plus nothing else.
- No `'use server'` directive — `src/app/amend/page.tsx` wraps it.
- Same gate order as Story 8.8: user → player → validate → `witnessHash` loaded → `no-passphrase` → `bad-passphrase` → lane scoped by `playerId` (`not-found`) → `isWithinAmendWindow` (`outside-window`).
- Then loads the row to be removed: `prisma.checkIn.findUnique({ where: { laneId_date: { laneId, date } }, select: { isRest: true } })`; returns `{ ok: false, error: 'not-found' }` when null — there is nothing to withdraw from a day that was never marked.
- On success runs both writes in one `prisma.$transaction([...])`: `prisma.checkIn.delete({ where: { laneId_date: { laneId, date } } })` and `prisma.checkInRemoval.create({ data: { laneId, date, wasRest: existing.isRest, note: note ?? null } })`. The log must not be able to exist without the deletion, or vice versa.
- The `$transaction` call is wrapped in try/catch returning `{ ok: false, error: 'not-found' }`, mirroring `src/app/actions/deleteLane.ts:34-42` — a row deleted by another tab between the read and the write must be a refusal, not an unhandled rejection.
- Then `revalidatePath('/')`, `revalidatePath('/amend')`, and `revalidatePath('/history')`, then returns `{ ok: true }`.
- Does NOT touch `prisma.streakFreeze` or `prisma.bossBattle`. A withdrawal never unwinds a defeated boss or the `defeats` count that drives avatar level.
- Test file mocks `@/lib/db` (including `$transaction`), `@/lib/tenancy`, `next/cache`, `@/lib/trainingDay`. Real `amendWindow` and `witnessPassphrase`.

**Testing:**
- Test returns bad-passphrase for a wrong passphrase and does not delete
- Test returns not-found when no check-in exists for that day
- Test returns outside-window for a day before this week's Monday
- Test deletes the check-in and creates a removal in one transaction
- Test removal records wasRest from the deleted row
- Test does not call streakFreeze.updateMany
- Test returns not-found when the transaction throws

---

## Story 8.10 — Harden deleteCheckIn: player scope and window

**Depends on:** Story 8.4

`deleteCheckIn` scopes by `userId` where `createCheckIn` scopes by `playerId`,
so it can reach a sibling player's lane on the same account; and it has no date
window at all, so it can remove any day in the season. Both gaps are only
reachable by calling the action directly rather than through the Undo button —
but after this epic there is a sanctioned door for past days, so this one should
only ever open on today.

**Files to modify:**
- `src/app/actions/deleteCheckIn.ts`
- `src/app/actions/deleteCheckIn.test.ts`

**Acceptance Criteria:**
- `deleteCheckIn(laneId: string, date: Date): Promise<{ ok: true } | { ok: false; error: string }>` remains the SOLE export with an unchanged signature — `src/app/page.tsx` passes it as-is and must not need editing.
- Imports gain `{ requirePlayerId } from '@/lib/tenancy'`, `{ isWithinCheckInWindow } from '@/lib/checkInWindow'`, `{ getTrainingDay } from '@/lib/trainingDay'`.
- After `requireUserId()`, calls `requirePlayerId(userId)`.
- Returns `{ ok: false, error: 'outside-window' }` when `isWithinCheckInWindow(date, getTrainingDay(new Date()))` is false — the same window `createCheckIn` already enforces, so Undo stays symmetric with the button that created the row. Past days go through `withdrawCheckIn`.
- The `deleteMany` where-clause changes from `{ laneId, date, lane: { userId } }` to `{ laneId, date, lane: { playerId } }`.
- `revalidatePath('/')` and the `count !== 1` → `not-found` behaviour are unchanged.
- A comment points at `withdrawCheckIn` as the path for an earlier day, so the window does not read as an oversight.
- Test file mocks `@/lib/tenancy` to return both `requireUserId` and `requirePlayerId`, and mocks `@/lib/trainingDay`. Existing test cases are updated, not duplicated.

**Testing:**
- Test deleteMany where-clause scopes by playerId not userId
- Test returns outside-window for a day older than the grace window
- Test does not call deleteMany when the day is outside the window
- Test returns not-found when count is zero

---

## Story 8.11 — WitnessPassphrasePanel component

**Depends on:** Story 8.3

The `/account` panel where a parent sets or replaces the passphrase. Two fields
and a confirm, because a typo in a write-only secret is otherwise discovered on
the night it is needed.

**Files to create:**
- `src/components/WitnessPassphrasePanel.tsx`
- `src/components/WitnessPassphrasePanel.test.tsx`

**Acceptance Criteria:**
- Default-exports a `'use client'` component named `WitnessPassphrasePanel`.
- Props: `isSet: boolean`, `minLength: number`, `setWitnessPassphrase: (passphrase: string) => Promise<{ ok: boolean; error?: string }>`.
- Renders `data-testid="witness-passphrase"` wrapper, a heading, and copy explaining what the passphrase is for: it unlocks the amend page so a parent can put a day on the record or take one off, and it is not a second account — anyone with the Google sign-in can reset it.
- Renders two `type="password"` inputs (`data-testid="witness-passphrase-input"` and `witness-passphrase-confirm`) and a submit button `data-testid="witness-passphrase-submit"`.
- When `isSet` is true the heading/button copy reads as replacing an existing passphrase; when false, as setting the first one. No field asks for the current passphrase in either case.
- The button is disabled unless both fields are non-empty, equal, and at least `minLength` characters. Mismatch renders `data-testid="witness-passphrase-error"` with "Those two don't match."
- Submits inside `useTransition`, wrapped in try/catch — a rejected transition otherwise escalates to the nearest error boundary, the same reason `DeleteAccountPanel` catches.
- On `{ ok: true }` clears both fields and renders `data-testid="witness-passphrase-saved"`. On `{ ok: false }` renders the error node.
- Imports nothing from `@/lib/db`, `@/lib/tenancy`, or `@/lib/witnessPassphrase` — the minimum arrives as a prop so the crypto module never reaches the client bundle.
- Test file uses RTL and `vi.fn()` for the action prop; it does not `vi.mock` anything under `@/lib`.

**Testing:**
- Test submit is disabled when the two fields differ
- Test submit is disabled when the passphrase is shorter than minLength
- Test shows a mismatch message when the confirm differs
- Test calls setWitnessPassphrase with the typed value when armed
- Test shows the saved confirmation on ok true
- Test shows an error message on ok false

---

## Story 8.12 — Account page: wire the passphrase panel

**Depends on:** Story 8.7, Story 8.11

Mount `WitnessPassphrasePanel` on `/account`, above the delete panel. This page
is the only place the passphrase is set, and `/amend` sends a parent here when
none exists.

**Files to create:**
- `src/app/account/page.test.tsx`

**Files to modify:**
- `src/app/account/page.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` remains declared.
- `src/app/account/page.test.tsx` is new — this page has never had a test. It mocks `@/auth`, `@/lib/db`, and `next/navigation`, following the shape of `src/app/history/page.test.tsx`.
- Keeps the existing `auth()` + `redirect('/signin')` gate; does NOT switch to `getViewer` — there is no account to manage without one.
- Reads `const row = await prisma.user.findUnique({ where: { id: session.user.id }, select: { witnessHash: true } })` and passes `isSet={Boolean(row?.witnessHash)}`. The hash itself is never passed to the client.
- Passes `minLength={MIN_WITNESS_PASSPHRASE_LENGTH}` imported from `@/lib/validation` (not from the crypto module — see Story 8.3).
- Passes `setWitnessPassphrase` through an inline `"use server"` closure: `async (passphrase) => { "use server"; return setWitnessPassphrase(passphrase) }`.
- `WitnessPassphrasePanel` renders above `DeleteAccountPanel`; the delete panel and its wiring are unchanged.

**Testing:**
- Test renders the witness panel with isSet false when witnessHash is null
- Test renders the witness panel with isSet true when witnessHash is present
- Test still renders the delete account panel

---
## Story 8.13 — AmendWeekGrid component

**Depends on:** Story 8.5

The grid: one row per live lane, one cell per day from Monday to today. Tapping
an amendable cell opens the choices for that day. Cells are sized to be tapped
on a phone rather than to match History's 24px display squares — this is a
control surface, not a record.

The passphrase is entered once for the visit and sent with every write — no
witness session cookie, so a write is verified at the moment it happens rather
than against a state that was true minutes ago.

**Files to create:**
- `src/components/AmendWeekGrid.tsx`
- `src/components/AmendWeekGrid.test.tsx`

**Acceptance Criteria:**
- Default-exports a `'use client'` component named `AmendWeekGrid`.
- Props: `lanes: AmendLaneWeek[]` (the type from `@/lib/amendWeek`), `attestCheckIn: (input: { laneId: string; date: Date; isRest: boolean; note?: string | null; passphrase: string }) => Promise<{ ok: boolean; error?: string }>`, `withdrawCheckIn: (input: { laneId: string; date: Date; note?: string | null; passphrase: string }) => Promise<{ ok: boolean; error?: string }>`.
- Renders a single `type="password"` field `data-testid="amend-passphrase"` at the top, held in component state for the visit only — never written to `localStorage`, `sessionStorage`, or a cookie. The component does NOT gate on whether a passphrase exists; `/amend` redirects before rendering it (Story 8.14).
- For each lane renders a row whose `data-testid` is ``amend-row-${lane.id}``, with the lane emoji and name, and one cell per day whose `data-testid` is ``amend-cell-${lane.id}-${yyyy-MM-dd}`` (the day formatted as `yyyy-MM-dd`). Each cell is labelled with its weekday so a parent can tell Tuesday from Thursday without counting.
- Cell appearance by `state`: `session` green, `rest` blue, `withdrawn` outlined/hollow, `empty` neutral — the colour language History already uses. A cell with `attested` true carries a visible ring and a `title` naming it as attested by a witness, so an attested day never passes as a tap the player made.
- Cells are at least 44×44px of tap target. A cell with `amendable: false` is rendered but not interactive (`disabled`, no handler).
- Tapping an amendable cell opens an inline panel `data-testid="amend-day-panel"` with: "He showed up" → `attestCheckIn({ isRest: false })`; "Rest day" → `attestCheckIn({ isRest: true })`; "This one didn't happen" → `withdrawCheckIn` (rendered only when the cell state is `session` or `rest`); an optional note field; and a cancel. Only one day panel is open at a time.
- Every write runs inside `useTransition` and a try/catch, and sends the current passphrase value. A `{ ok: false }` result renders `data-testid="amend-error"` with copy keyed off the error: `bad-passphrase` → "That passphrase didn't match."; `no-passphrase` → a line pointing at `/account`; `outside-window` → a line saying amendments reach only the current week; anything else → a neutral retry line.
- The passphrase is NOT cleared on a failed write — a parent fixing a typo should not have to retype a day's worth of context.
- All copy is effort-framed (architecture §4): no "missed", "failed", "deficit", or "cheated". The withdraw control reads as a record correction, and a withdrawn day shows no penalty framing.
- Imports nothing from `@/lib/db`, `@/lib/tenancy`, or `@/lib/witnessPassphrase`. It may import the `AmendLaneWeek` type from `@/lib/amendWeek`.
- Test file uses RTL with `vi.fn()` action props; it does not `vi.mock` anything under `@/lib`.

**Testing:**
- Test renders one cell per day in the lane's days array
- Test a non-amendable cell is disabled
- Test tapping an amendable cell opens the day panel
- Test only one day panel is open at a time
- Test the withdraw control is absent for an empty day
- Test "He showed up" calls attestCheckIn with isRest false and the typed passphrase
- Test "Rest day" calls attestCheckIn with isRest true
- Test "This one didn't happen" calls withdrawCheckIn for a session day
- Test shows the passphrase message when the action returns bad-passphrase
- Test the passphrase field keeps its value after a failed write
- Test an attested cell renders the witness ring

---

## Story 8.13a — Proxy: gate /amend behind an active player

`src/proxy.ts` (Next 16's renamed middleware) redirects a signed-in user with no
`x-active-player-id` cookie to `/choose-player`, but only for the paths listed in
`GATED_PATHS`. A new route is ungated by default, so `/amend` would let
`requirePlayerId` fall back to the oldest player — the exact silent fallback the
Epic 7 gate exists to prevent. Amending the wrong kid's week is the worst
possible version of that bug.

**Files to modify:**
- `src/proxy.ts`
- `src/proxy.test.ts`

**Acceptance Criteria:**
- `GATED_PATHS` gains `"/amend"`. The array is otherwise unchanged and the `config.matcher` is untouched.
- A signed-in request to `/amend` with no `x-active-player-id` cookie redirects to `/choose-player`.
- A signed-in request to `/amend` WITH the cookie passes through.
- A signed-out request to `/amend` passes through the proxy — the page's own `auth()` gate sends it to `/signin` (Story 8.14), because the app is public and the proxy never gates a demo visitor.
- New test cases follow the existing `makeRequest`/`call` helpers in `src/proxy.test.ts`; no helper is rewritten.

**Testing:**
- Test redirects a signed-in user with no active-player cookie from /amend to /choose-player
- Test does not redirect /amend when the active-player cookie is present
- Test does not redirect a signed-out request to /amend

---

## Story 8.14 — /amend page

**Depends on:** Story 8.5, Story 8.8, Story 8.9, Story 8.13, Story 8.13a

The route. Loads this week's rows for the active player's live lanes, builds the
grid, and wires both actions. Gated on a real session like `/account`: there is
no amending a demo season.

**Files to create:**
- `src/app/amend/page.tsx`
- `src/app/amend/page.test.tsx`

**Acceptance Criteria:**
- Default-exports an async React Server Component. `export const dynamic = 'force-dynamic'` is declared.
- Uses `auth()` and redirects to `/signin` when there is no `session.user` — it does NOT use `getViewer`, so no demo path exists. Resolves the player with `requirePlayerId(session.user.id)`.
- Redirects to `/account` when the user's `witnessHash` is null, so a parent with no passphrase lands where they can set one instead of on a grid they cannot use. This is the gate — the grid component itself has no passphrase-absent branch.
- Loads `prisma.prize.findUnique({ where: { playerId } })` for `seasonStart`, and `prisma.lane.findMany({ where: { isActive: true, playerId }, orderBy: { sortOrder: 'asc' }, include: { checkIns: { where: { date: { gte: weekStart } } }, removals: { where: { date: { gte: weekStart } } } } })` where `weekStart = getWeekStart(getTrainingDay(new Date()))` — only this week is fetched, because only this week is amendable.
- Filters out lanes where `isLanePending(lane.startsOn, weekStart)` is true, matching the dashboard.
- Builds rows with `buildAmendWeek(lanes, today, prize?.seasonStart ?? null)` and passes them to `AmendWeekGrid`.
- Wires both actions through inline `"use server"` closures, the pattern `src/app/page.tsx` uses for `createCheckIn`.
- Page copy frames the whole thing as a witness statement, says plainly that it reaches only the current running week, and says that the player can see every amendment. No "missed"/"deficit" language.
- Renders a short explanation when the player has no live lanes this week rather than an empty grid.
- Renders a link back to `/history`, so the trip is round rather than one-way.

**Testing:**
- Test redirects to /signin when there is no session
- Test redirects to /account when witnessHash is null
- Test lane query is scoped by playerId and this week's weekStart
- Test removals are fetched only from this week's Monday
- Test pending lanes are excluded from the grid
- Test renders the grid when lanes exist
- Test renders the no-lanes explanation when every lane is pending

---

## Story 8.15 — History page: scope to the active player

An Epic 6 leftover, and a prerequisite for putting an amend door on this page:
`loadHistory` still queries `prisma.lane.findMany({ where: { userId } })` and
`prisma.prize.findUnique({ where: { userId } })`, so an account with two kids
sees both kids' lanes in one season grid. Every other page was scoped to
`playerId` in Epic 6; this one was missed.

Independent of the amendment feature and shippable on its own.

**Files to modify:**
- `src/app/history/page.tsx`
- `src/app/history/page.test.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` remains declared.
- `loadHistory`'s `user` branch changes `prisma.prize.findUnique({ where: { userId } })` to `{ where: { playerId: viewer.playerId } }` and `prisma.lane.findMany({ where: { userId } })` to `{ where: { playerId: viewer.playerId } }`.
- `loadHistory` takes the whole `viewer` as it does today; the `seasonStart` filter on `checkIns` and the `orderBy` clauses are unchanged.
- The demo branch is unchanged.
- No rendering change: the recap rows, colour language, retired tag, and boss-day purple are untouched.

**Testing:**
- Test lane query is scoped by playerId not userId
- Test prize query is scoped by playerId not userId
- Test the demo branch still renders the demo season

---

## Story 8.16 — History page: the door to /amend

**Depends on:** Story 8.14, Story 8.15

The button. `/amend` is a page nobody visits unless told it exists, and the place
a parent notices a wrong week is the History grid — so that is where the door
goes, next to the week it opens onto.

**Files to modify:**
- `src/app/history/page.tsx`
- `src/app/history/page.test.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` remains declared.
- Renders a `next/link` to `/amend` with `data-testid="amend-link"`, styled as a button, inside the recap section whose `weekStart` equals `thisWeekStart` — beside that section's `<h2>`, so the door sits with the week it acts on rather than at the top of the page.
- The link renders only when `viewer.kind === 'user'`. A demo visitor never sees it, because there is nothing for them to amend and no action they could reach.
- When `buildWeekRecaps` emits no section for the current week — nothing checked in this week at all — the page renders a "This week" heading carrying the link alone, so the week most likely to need amending is not the one week with no door on it.
- Link copy reads as an offer to put this week's record straight: not an accusation, not an admin control, and no "missed"/"deficit" language.
- No other part of the page changes: `buildWeekRecaps`, the per-day colour language, the retired tag, the boss-day purple, and the closed weeks' rows are untouched. A withdrawn day stays blank here — the removal log is read by `/amend` only.

**Testing:**
- Test renders the amend link in the current week's section for a signed-in viewer
- Test does not render the amend link for a demo viewer
- Test renders a This week heading with the link when no check-ins exist this week
- Test the closed weeks' recap rows still render unchanged
