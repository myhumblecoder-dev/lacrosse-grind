# Architecture — lacrosse-grind

*Backbone document. Every story's `**Files to create/modify:**` paths are drawn from §3. Stories never invent paths.*

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, `src/`, TypeScript) | React 19; RSC by default |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix primitives) | utilities + shadcn only; no bespoke CSS files |
| Data | **Prisma 6 ORM** + **PostgreSQL** (Neon serverless) | single connection via singleton |
| Mutations/reads | **Server Actions** (per-concern files in `src/app/actions/`) | no REST route handlers |
| Validation | **Zod** (`src/lib/validation.ts`) | validate before any DB write |
| AI | **LLM helper** (`src/lib/llm.ts`) — Ollama local default, Anthropic opt-in | direct `fetch`, no AI SDK dependency |
| Dates | **date-fns** + **date-fns-tz** — all compute/format in UTC | `startOfDay`, `differenceInCalendarDays`, `formatInTimeZone` |
| Tests | **Vitest** + **React Testing Library**, co-located `*.test.tsx` / `*.test.ts` | scaffolded by greenfield `--with-vitest` |
| CI/CD | **GitHub Actions** (lint + build + test) → **Vercel** | scaffolded by `--with-actions` |
| Auth | **None** — single-user app | explicit Brief decision; no session/User model |

---

## 2. Data Model — `prisma/schema.prisma`

Source of truth for all persistence.

**Schema changes reach production through CD, not the build.** This repo is
schema-first — there is no `prisma/migrations/`, so the schema file *is* the
migration. The sync lives in `.github/workflows/cd.yml`, which on every push to
`main` runs `prisma db push --accept-data-loss` against the real production
`DATABASE_URL` **before** `vercel build` and `vercel deploy`, so code and
database always move together. Three consequences worth knowing:

- **`vercel-build` must never push.** It once did (`prisma generate && prisma db
  push && next build`) and was reverted in `c619163`: a build must not mutate a
  database, CI only has a placeholder `DATABASE_URL` so the push failed with
  P1001, and on Vercel previews it risked pushing a branch's schema at the
  shared database. Vercel's own auto-deploy for `main` is disabled in
  `vercel.json` for the same reason — code must not go live ahead of the sync.
- **CI runs plain `build`**, which has no push, against a placeholder
  `DATABASE_URL`.
- **`--accept-data-loss` is on in CD deliberately.** `db push` refuses any diff
  its heuristic flags, including provably safe ones (a unique index on a
  just-added all-NULL column, epic 6). Destructive schema changes are gated
  upstream instead, by two reviewed merges — the story PR into `develop` and the
  release PR into `main`.

A schema change therefore needs no manual push and nobody needs the production
connection string: it lands when the release PR merges to `main`. Vercel marks
every Postgres variable *sensitive*, so `vercel env pull` returns `[SENSITIVE]`
rather than the value, and CD falls back to the `DATABASE_URL` repo secret.

```prisma
// Lane — a skill domain Eddie trains (e.g. "Stick Skills", "Shooting", "Conditioning")
model Lane {
  id            String   @id @default(cuid())
  name          String
  emoji         String   @default("🥍")
  targetPerWeek Int      @default(5)   // days/week target frequency
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())

  checkIns      CheckIn[]
  removals      CheckInRemoval[]  // epic 8
  bossBattles   BossBattle[]

  @@index([isActive])
}

// CheckIn — Eddie's daily self-report for a lane session
model CheckIn {
  id          String   @id @default(cuid())
  laneId      String
  lane        Lane     @relation(fields: [laneId], references: [id])
  date        DateTime // UTC midnight of the check-in day
  isRest      Boolean  @default(false)  // true = rest/sleep entry (counts as a hit)
  note        String?  // optional free-text (effort note, not a grade)
  // Epic 8: set when a witness (a parent) put this day on the record rather
  // than the player tapping it. NULL = the player's own check-in.
  attestedAt   DateTime?
  attestedNote String?  // the witness's words; `note` stays the player's
  createdAt   DateTime @default(now())

  @@unique([laneId, date])
  @@index([date])
  @@index([laneId, date])
}

// CheckInRemoval — epic 8: the log of days taken back off the record.
// A withdrawal DELETES the CheckIn row and writes one of these. A `withdrawnAt`
// flag would need filtering by every reader (dashboard, History, weekRecap,
// streak, qualifyingWeek, demoSeason, boss battles, prize) and one missed
// filter would silently score a withdrawn day. Append-only, so no unique index.
model CheckInRemoval {
  id        String   @id @default(cuid())
  laneId    String
  lane      Lane     @relation(fields: [laneId], references: [id], onDelete: Cascade)
  date      DateTime // UTC midnight of the day withdrawn
  wasRest   Boolean  @default(false)
  note      String?
  createdAt DateTime @default(now())

  @@index([laneId, date])
}

// BossBattle — every 2-week skill test for a lane
model BossBattle {
  id           String   @id @default(cuid())
  laneId       String
  lane         Lane     @relation(fields: [laneId], references: [id])
  weekStarting DateTime // UTC midnight of the Monday starting the 2-week block
  selfReport   String   // Eddie's free-text description of how it went
  coachNote    String?  // AI-generated coach note (process-framed, never graded)
  createdAt    DateTime @default(now())

  @@unique([laneId, weekStarting])
  @@index([weekStarting])
}

// WeeklyReflection — Eddie's weekly free-text entry + AI summary
model WeeklyReflection {
  id           String   @id @default(cuid())
  weekStarting DateTime // UTC midnight of the Monday
  playerNote   String   // Eddie's reflection
  coachSummary String?  // AI-generated summary (effort-framed)
  createdAt    DateTime @default(now())

  @@unique([weekStarting])
  @@index([weekStarting])
}

// StreakFreeze — banked freeze tokens (one guilt-free miss per token)
model StreakFreeze {
  id        String   @id @default(cuid())
  laneId    String
  usedDate  DateTime? // null = still available
  createdAt DateTime  @default(now())

  @@index([laneId])
}

// Player — a kid tracked under one account (epic 6 multi-player). Private to
// the owning User; lanes and prize/season state hang off the player.
model Player {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  lanes  Lane[]
  prizes Prize[]

  @@unique([userId, name])
  @@index([userId])
}
```

**`Prize.userId` is NOT unique** (epic 8 follow-up, #549). One prize per *player*
is the domain rule, so an account with two kids holds two `Prize` rows sharing a
`userId`; `User` therefore has `prizes Prize[]`, not `prize Prize?`. While that
column was unique, `upsertPrize` keying on it could only ever maintain one row per
account — a second kid's prize found the first kid's row and overwrote it, and
because the create never set `playerId`, no reader could then find either. Prize
and season writes are keyed on `playerId`; `userId` survives only as the ownership
link used by account deletion.

**Scoping rule for actions:** anything belonging to a *kid* — lanes, check-ins,
boss battles, freezes, the prize, `seasonStart` — is scoped by `playerId`. Only
things belonging to the *account* stay on `userId`: the player roster and its cap,
`MAX_LANES_PER_USER`, `CoachCall` (the LLM spend cap is billing, per account), the
witness passphrase, and account deletion. Counting a kid's progress across the
account is the bug class #549 covers: a sibling's defeats set the wrong rank, and
a sibling's lanes moved the wrong goalposts.

The Auth.js models (`User`, `Account`, `Session`, `VerificationToken`) are not
mirrored above — they are the adapter's, unchanged except for one app column:
`User.witnessHash String?`, the scrypt `"salt:hash"` of the witness passphrase
that unlocks `/amend` (epic 8). NULL means never set. It is not a second
account: whoever holds the Google sign-in can replace it from `/account`,
because the session is already proof of ownership. It exists to stop a kid on
an unlocked device, nothing more.

Multi-player (epic 6): `Lane` and `Prize` each gain a nullable `playerId
String?` column (additive — `db push` applies without data loss); the
`ensureDefaultPlayer` action binds orphan rows to the account's default
player on first login.

No `User` model — single-user MVP.

---

## 3. File & Folder Inventory

**The canonical path universe. Every story's `**Files to create/modify:**` paths are drawn from this table — stories never invent paths.**

| Path | Kind | Purpose |
|---|---|---|
| `prisma/schema.prisma` | data | Full schema (§2) |
| `src/lib/db.ts` | lib | Prisma client singleton (`globalThis` guard); exports `prisma` |
| `src/lib/validation.ts` | lib | Zod schemas: `laneSchema`, `checkInSchema`, `bossBattleSchema`, `reflectionSchema` |
| `src/lib/llm.ts` | lib | LLM helper: `generate(prompt): Promise<string>`; Ollama default / Anthropic opt-in |
| `src/lib/streak.ts` | lib | Streak computation: `computeStreak(checkIns, today, frozenDates?): number` — a day covered by a spent freeze counts as a hit |
| `src/lib/weekUtils.ts` | lib | Week boundary helpers: `getWeekStart(date: Date): Date`, `get2WeekBlockStart(date: Date): Date`, `formatWeekLabel(date: Date): string` — all UTC via date-fns-tz |
| `src/app/actions/createLane.ts` (+ `.test.ts`) | action | Create a Lane; validates with `laneSchema` |
| `src/app/actions/updateLane.ts` (+ `.test.ts`) | action | Toggle active/sort/name/emoji/frequency |
| `src/app/actions/createCheckIn.ts` (+ `.test.ts`) | action | Record a daily check-in (or rest entry) |
| `src/app/actions/deleteCheckIn.ts` (+ `.test.ts`) | action | Remove today's check-in (undo) — player-scoped and bounded to the check-in window; an earlier day goes through `withdrawCheckIn` |
| `src/app/actions/createBossBattle.ts` (+ `.test.ts`) | action | Submit boss battle self-report → calls `generate()` for coach note |
| `src/app/actions/createReflection.ts` (+ `.test.ts`) | action | Submit weekly reflection → calls `generate()` for coach summary |
| `src/app/actions/awardFreeze.ts` (+ `.test.ts`) | action | Award a streak freeze token to a lane |
| `src/app/actions/spendFreeze.ts` (+ `.test.ts`) | action | Spend a freeze on the missed day that breaks a streak (named `spendFreeze`, not `useFreeze`: a `useX` export trips React's rules-of-hooks lint) |
| `src/app/actions/ensureDefaultPlayer.ts` (+ `.test.ts`) | action | Epic 6: create/bind the account's default player, adopt orphan lanes/prize |
| `src/app/actions/createPlayer.ts` (+ `.test.ts`) | action | Epic 6: add a player (cap 6 per account) |
| `src/app/actions/switchPlayer.ts` (+ `.test.ts`) | action | Epic 6: set the active-player cookie |
| `src/components/PlayerSwitcher.tsx` (+ `.test.tsx`) | component | Epic 6: active-player switcher UI |
| `src/lib/repairableGap.ts` (+ `.test.ts`) | lib | `findRepairableGap(checkIns, today, frozenDates?)` — the missed day worth a token, or null |
| `src/lib/checkInAuthorship.ts` (+ `.test.ts`) | lib | Epic 8: `mayRecord`/`mayRemove` — who owns a `CheckIn` row and may this actor change it. The ONE place the attestation rule lives; all four check-in actions call it rather than re-deriving it |
| `src/lib/witnessPassphrase.ts` (+ `.test.ts`) | lib | Epic 8: `hashWitnessPassphrase`/`verifyWitnessPassphrase` over `node:crypto` scrypt. Holds NO constants — `MIN_WITNESS_PASSPHRASE_LENGTH` lives in `validation.ts` so nothing client-reachable ever imports this |
| `src/lib/amendWindow.ts` (+ `.test.ts`) | lib | Epic 8: `isWithinAmendWindow(date, today, floors?)` — the current running week, floored by lane `startsOn` and `seasonStart` |
| `src/lib/amendWeek.ts` (+ `.test.ts`) | lib | Epic 8: `buildAmendWeek(lanes, today, seasonStart)` — Monday→today cells per lane, including the empty ones `buildWeekRecaps` omits |
| `src/app/actions/setWitnessPassphrase.ts` (+ `.test.ts`) | action | Epic 8: set/replace the witness passphrase (Google session is the only gate) |
| `src/app/actions/attestCheckIn.ts` (+ `.test.ts`) | action | Epic 8: put a past day of the current week on the record; refunds a freeze spent on that day |
| `src/app/actions/withdrawCheckIn.ts` (+ `.test.ts`) | action | Epic 8: take a day off the record — deletes the CheckIn and logs a CheckInRemoval in one transaction |
| `src/components/WitnessPassphrasePanel.tsx` (+ `.test.tsx`) | client | Epic 8: set/replace the passphrase on `/account` |
| `src/components/AmendWeekGrid.tsx` (+ `.test.tsx`) | client | Epic 8: the Monday→today grid; passphrase held for the visit and sent with every write |
| `src/app/amend/page.tsx` (+ `.test.tsx`) | route | Epic 8: the amend surface — session-gated, redirects to `/account` with no passphrase |
| `src/proxy.ts` (+ `.test.ts`) | route | Next 16's renamed middleware: a signed-in user with no active player is sent to `/choose-player`. `GATED_PATHS` must list every new authed route |
| `src/app/page.tsx` | route | Daily dashboard — today's checklist across all active lanes |
| `src/app/layout.tsx` | route | Root layout — nav shell (modify scaffold version) |
| `src/app/lanes/page.tsx` | route | Lane management — list, add, toggle active, reorder |
| `src/app/boss-battles/page.tsx` | route | Boss battle hub — current 2-week block per lane, submit form |
| `src/app/reflection/page.tsx` | route | Weekly reflection — write/view this week's entry + AI summary |
| `src/app/history/page.tsx` | route | Streak history — per-lane calendar heatmap of check-ins |
| `src/components/CheckInCard.tsx` (+ `.test.tsx`) | client | One lane's daily check-in tile (hit / rest / skip; streak badge) |
| `src/components/LaneList.tsx` (+ `.test.tsx`) | server | Ordered list of lane cards |
| `src/components/LaneForm.tsx` (+ `.test.tsx`) | client | Add/edit lane form |
| `src/components/BossBattleForm.tsx` (+ `.test.tsx`) | client | Boss battle self-report form + displays AI coach note |
| `src/components/ReflectionForm.tsx` (+ `.test.tsx`) | client | Weekly reflection textarea + displays AI summary |
| `src/components/StreakBadge.tsx` (+ `.test.tsx`) | server | Flame badge showing current streak count |
| `src/components/FreezeBadge.tsx` (+ `.test.tsx`) | server | Ice badge showing available freeze tokens |
| `src/components/WeeklyProgress.tsx` (+ `.test.tsx`) | server | Per-lane progress bar (hits / target this week) |
| `src/components/ui/*` | ui | shadcn primitives — add via `shadcn add <component>` as needed |
| `.env.example` | config | `DATABASE_URL`, `LLM_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` (+ commented `ANTHROPIC_*`) |

---

## 4. Conventions (the coder's house rules — applied every story)

- **Data access:** all reads/writes go through **Server Actions** in `src/app/actions/<actionName>.ts`. One exported function per file. No `app/api/*` route handlers.
- **Prisma client:** `import { prisma } from "@/lib/db"`. Exactly one client via `src/lib/db.ts` `globalThis` singleton.
- **Validation:** every action validates with a Zod schema from `src/lib/validation.ts`; validates before any DB call.
- **Date math:** use `date-fns` + `date-fns-tz`; all dates stored and computed in UTC. `getWeekStart`/`get2WeekBlockStart` helpers in `src/lib/weekUtils.ts`.
- **AI calls:** import `generate` from `src/lib/llm.ts`; never import Anthropic SDK or Ollama directly in feature code.
- **Components:** Server Components by default; add `"use client"` only for interactivity (forms, click handlers). Lists that only render data stay server.
- **DB-reading pages:** MUST export `export const dynamic = 'force-dynamic'` to prevent static prerender (next build would fail otherwise).
- **Actions with DB mutations:** MUST co-locate a `*.test.ts` file that mocks `prisma` and asserts the exact Prisma call.
- **Styling:** shadcn/ui for primitives, Tailwind utilities for layout. No standalone `.css` files.
- **Tests:** co-located `Foo.test.tsx` beside `Foo.tsx`; Vitest + RTL; actions mock `@/lib/db`, never hit Postgres.
- **Imports:** `@/*` alias for everything under `src/`.
- **One export per file:** no hedge twins; each symbol implemented exactly once.
- **Effort-framed copy:** no "missed," "failed," "deficit." Use "skipped," "rest day," "keep going."

---

## 5. Data Flow (per feature)

```
CheckInCard ("use client")
  ──createCheckIn(laneId, date)──▶ actions/createCheckIn.ts
     ──Zod validate──▶ prisma.checkIn.upsert
     ──revalidatePath('/')──▶ page.tsx re-renders

page.tsx (server, force-dynamic)
  ──prisma.lane.findMany──▶ lanes + today's checkIns
  ──computeStreak(checkIns, today)──▶ StreakBadge
  ──renders──▶ CheckInCard[] + WeeklyProgress[]

BossBattleForm ("use client")
  ──createBossBattle(laneId, weekStarting, selfReport)──▶ actions/createBossBattle.ts
     ──Zod validate──▶ generate(coachPrompt) ──▶ prisma.bossBattle.upsert

ReflectionForm ("use client")
  ──createReflection(weekStarting, playerNote)──▶ actions/createReflection.ts
     ──Zod validate──▶ generate(summaryPrompt) ──▶ prisma.weeklyReflection.upsert

history/page.tsx (server, force-dynamic)
  ──renders──▶ Link to /amend, in the current week's section

amend/page.tsx (server, force-dynamic)
  ──auth() ──▶ /signin, or witnessHash null ──▶ /account
  ──prisma.lane.findMany (this week's checkIns + removals)──▶ buildAmendWeek
  ──renders──▶ AmendWeekGrid

AmendWeekGrid ("use client")
  ──attestCheckIn({laneId, date, isRest, passphrase})──▶ actions/attestCheckIn.ts
     ──Zod validate ──▶ verifyWitnessPassphrase ──▶ isWithinAmendWindow
     ──prisma.checkIn.upsert (attestedAt) ──▶ streakFreeze refund
     ──revalidatePath('/', '/amend', '/history')
  ──withdrawCheckIn({laneId, date, passphrase})──▶ actions/withdrawCheckIn.ts
     ──same gates ──▶ $transaction[checkIn.delete, checkInRemoval.create]
```

---

## 6. How This Decomposes into the DAG (orientation for epics & stories)

The inventory + conventions make story file-lists mechanical:

- **Epic 1 — Core Habit Loop:** schema → db singleton + week/streak libs → validation → lane actions (create, update) → check-in actions (create, delete) → daily dashboard page + CheckInCard/StreakBadge/WeeklyProgress → lane management page + LaneList/LaneForm.
- **Epic 2 — Boss Battles:** boss battle action + BossBattleForm → boss battle hub page — depends on lanes (Epic 1).
- **Epic 3 — AI Layer:** LLM helper lib → wire into createBossBattle + createReflection → reflection action + ReflectionForm → reflection page — depends on Epic 1 schema.
- **Epic 4 — Reflection & Streaks:** weekly reflection page → streak freeze actions (award, use) + FreezeBadge → history heatmap page.
