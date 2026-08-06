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

**Schema changes reach production via the build, not by hand.** This repo is
schema-first — there is no `prisma/migrations/`, so the schema file *is* the
migration. `package.json` therefore defines a `vercel-build` script that runs
`prisma db push` before `next build`; Vercel prefers `vercel-build` over
`build` when present, so every production deploy syncs the database to the
schema using the `DATABASE_URL` Vercel injects. Two consequences worth knowing:

- **CI still runs plain `build`**, which has no `db push`. That is deliberate:
  CI sets a placeholder `DATABASE_URL` pointing at a database that does not
  exist, and a push there would fail every PR.
- **`db push` refuses any change that would lose data.** Additive changes (a
  new model, a new nullable column) apply silently; a rename or a dropped
  column fails the build instead of destroying rows. Never add
  `--accept-data-loss` to that script — it converts a blocked deploy into
  silent data loss.

Nobody needs the production connection string to ship a schema change. Vercel
marks every Postgres variable *sensitive*, so `vercel env pull` returns
`[SENSITIVE]` rather than the value and a local `prisma db push` against prod
is not possible without fetching the string out of the Neon console by hand.

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
  createdAt   DateTime @default(now())

  @@unique([laneId, date])
  @@index([date])
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
```

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
| `src/lib/streak.ts` | lib | Streak computation: `computeStreak(checkIns: CheckIn[], today: Date): number` using date-fns |
| `src/lib/weekUtils.ts` | lib | Week boundary helpers: `getWeekStart(date: Date): Date`, `get2WeekBlockStart(date: Date): Date`, `formatWeekLabel(date: Date): string` — all UTC via date-fns-tz |
| `src/app/actions/createLane.ts` (+ `.test.ts`) | action | Create a Lane; validates with `laneSchema` |
| `src/app/actions/updateLane.ts` (+ `.test.ts`) | action | Toggle active/sort/name/emoji/frequency |
| `src/app/actions/createCheckIn.ts` (+ `.test.ts`) | action | Record a daily check-in (or rest entry) |
| `src/app/actions/deleteCheckIn.ts` (+ `.test.ts`) | action | Remove today's check-in (undo) |
| `src/app/actions/createBossBattle.ts` (+ `.test.ts`) | action | Submit boss battle self-report → calls `generate()` for coach note |
| `src/app/actions/createReflection.ts` (+ `.test.ts`) | action | Submit weekly reflection → calls `generate()` for coach summary |
| `src/app/actions/awardFreeze.ts` (+ `.test.ts`) | action | Award a streak freeze token to a lane |
| `src/app/actions/useFreeze.ts` (+ `.test.ts`) | action | Mark a freeze token used for a lane+date |
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
```

---

## 6. How This Decomposes into the DAG (orientation for epics & stories)

The inventory + conventions make story file-lists mechanical:

- **Epic 1 — Core Habit Loop:** schema → db singleton + week/streak libs → validation → lane actions (create, update) → check-in actions (create, delete) → daily dashboard page + CheckInCard/StreakBadge/WeeklyProgress → lane management page + LaneList/LaneForm.
- **Epic 2 — Boss Battles:** boss battle action + BossBattleForm → boss battle hub page — depends on lanes (Epic 1).
- **Epic 3 — AI Layer:** LLM helper lib → wire into createBossBattle + createReflection → reflection action + ReflectionForm → reflection page — depends on Epic 1 schema.
- **Epic 4 — Reflection & Streaks:** weekly reflection page → streak freeze actions (award, use) + FreezeBadge → history heatmap page.
