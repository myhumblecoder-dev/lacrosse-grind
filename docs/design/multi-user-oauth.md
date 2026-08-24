# Multi-user with Google OAuth — design

**Status: PLANNED, not yet scheduled (2026-08-21).** Assessed complexity:
medium — a well-bounded ~1–2 day conversion, not a rewrite. ~30 small
stories: ~24 Spike-grindable (one-file action/page fixes), ~5 hand-written
(auth wiring, schema, claim script, SSRF fix, cutover choreography).
Decision made: **open sign-ups**, with a per-user daily LLM cap as the
abuse mitigation. This document preserves the full design so scheduling it
is a decision, not a re-derivation.

Reuses the approved patterns from partner-coach-bot's
`docs/design/multi-user-saas.md` (Auth.js v5 + Google, `authorized`
callback, tenancy helper, `updateMany({where:{id, userId}})` IDOR fixes,
pre-created-User claim script + `allowDangerousEmailAccountLinking`).

## Why this is currently single-user, structurally

- No auth machinery at all; every query unscoped (loudest:
  `src/app/reflection/page.tsx` reads ALL WeeklyReflections with no where).
- `Prize` is a fixed-id `"prize"` singleton that doubles as the
  season-state table (`seasonStart` drives all season math).
- `WeeklyReflection` has a GLOBAL `@@unique([weekStarting])` — one
  reflection per week for the whole database.
- `StreakFreeze.laneId` is a bare String with no FK.
- All 18 server actions trust client-supplied cuids with zero ownership
  checks — a full IDOR surface the moment user #2 exists. 14 are exposed
  via inline `"use server"` closures that delegate to module action files.

## Schema changes (`prisma/schema.prisma`)

Add the standard Auth.js Prisma-adapter models (`User`, `Account`,
`Session`, `VerificationToken`); `User` gains `lanes`, `reflections`,
`prize` relations.

| Model | Change |
|---|---|
| `Lane` | `userId String?` + relation, `@@index([userId, isActive])`. Nullable first (two-phase), required in the final story. |
| `CheckIn` / `BossBattle` | **No field changes** — `[laneId,date]` / `[laneId,weekStarting]` uniques inherit tenant scope through Lane. Add `onDelete: Cascade`. |
| `WeeklyReflection` | `userId String?` + relation; unique becomes `@@unique([userId, weekStarting])`. |
| `StreakFreeze` | No userId — give `laneId` a real FK with `onDelete: Cascade`; ownership flows through the lane. |
| `Prize` | Singleton → per-user row: `id @default(cuid())`, `userId String? @unique`. The existing row keeps its literal `"prize"` id, gets userId backfilled. All ~12 sites switch `where:{id:"prize"}` → `where:{userId}`. |

## Auth wiring (hand-write)

- `src/auth.ts` — NextAuth with `PrismaAdapter(prisma)`,
  `Google({ allowDangerousEmailAccountLinking: true })` (load-bearing for
  the claim flow; Google emails are verified), an `authorized` callback
  (allow `/signin`, require session elsewhere), and a `session` callback
  copying `user.id` onto `session.user.id` (classic silent-failure gotcha).
- `src/app/api/auth/[...nextauth]/route.ts` — `export const { GET, POST } = handlers`.
- `src/proxy.ts` — `export { auth as default }` with a static-asset-excluding
  matcher (Next 16 proxy runs Node; Prisma in the adapter is fine).
- `src/app/signin/page.tsx` — Google button via `signIn("google")` server
  action; sign-out in `src/components/SidebarNav.tsx`.
- Deps: `next-auth@beta`, `@auth/prisma-adapter`. Env: `AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_TRUST_HOST` (Google
  redirect URI `<origin>/api/auth/callback/google`).

## Tenancy helper (grind)

`src/lib/tenancy.ts`: `requireUserId()` — `auth()` → `session.user.id` or
`redirect("/signin")`. The single source of "whose data"; mockable, which
is what makes the 24 action/page stories grindable.

## The ownership pattern — all 18 actions (grind, 1 file + test per story)

Every action starts `const userId = await requireUserId()`, then one of
four moves:

1. **Create under user** (createLane): add `userId` to create data.
2. **Create under a lane** (createCheckIn, createBossBattle, awardFreeze):
   verify parentage — `lane.findFirst({where:{id: laneId, userId}})` else
   `{ok:false}` — then proceed unchanged.
3. **Mutate by id** (updateLane, setLaneActive, deleteLane, swapLane,
   deleteCheckIn, editReflection, deleteReflection, useFreeze):
   `update/delete` → `updateMany/deleteMany` with `where:{id, userId}`
   (Lane/Reflection) or `where:{id, lane:{userId}}` (children); return
   `ok: count === 1`.
4. **Prize/season** (upsertPrize, deletePrize, uploadPrizePhoto,
   startSeason, resetSeason): `where:{userId}`; the reflection upsert key
   becomes `userId_weekStarting`.

The inline closures in pages are thin wrappers delegating to these module
files — the check inside the module covers both exposure paths; no closure
refactoring needed.

**uploadPrizePhoto (hand-eyes):** ~~drop or harden `fetchRemoteImage`
(https-only, reject private/link-local IPs — simplest is dropping remote
fetch), and prefix Blob pathnames with `userId`.~~ **DONE** — hardened
rather than dropped, so pasting a shop link still works:
`src/lib/fetchableUrl.ts` (https-only, no credentials, literal addresses
judged directly, every resolved address checked) over
`src/lib/publicAddress.ts`. Redirects are followed by hand and re-checked
per hop, since the automatic ones were the actual hole. Blob pathnames
are prefixed with `userId` and the filename is sanitised, or `..` would
climb straight out of that prefix.

**LLM abuse mitigation (open sign-ups):** pure `src/lib/llmCap.ts` + a
check in the 3 LLM actions (createBossBattle, createReflection,
editReflection): count today's generations for the user, cap at
`COACH_DAILY_LIMIT` (default ~20), friendly refusal past it.

## Page scoping (grind, 6 stories)

`const userId = await requireUserId()` then scope every query. Files:
`src/app/page.tsx`, `lanes/`, `boss-battles/`, `reflection/`, `history/`,
`prize/` pages.

## Eddie's data — zero-downtime cutover (hand choreography)

`vercel-build` runs `prisma db push`, so schema rides every deploy; this
ordering keeps old code working throughout:

1. Manual `prisma db push` to Neon (additive: new tables + nullable
   columns). Live code ignores them.
2. Run new `scripts/claim-user.ts <eddie-email>`: upsert User, then
   `updateMany({where:{userId:null}, data:{userId}})` on Lane,
   WeeklyReflection, Prize. Idempotent. Lane-scoped children untouched.
3. `vercel --prod` the auth+scoping code.
4. Eddie signs in with Google → `allowDangerousEmailAccountLinking` links
   his OAuth account to the pre-created User → all data present at first
   login. No empty-dashboard window.
5. Later: tighten `userId` to required; simplify `deleteLane` via cascades.

## Also in scope / deferred

- **In:** thread the player's first name (from the session) into the 3 LLM
  prompts that hardcode "Eddie".
- **Deferred:** per-user timezone (keep global 3am-Eastern
  `getTrainingDay`; add `User.timezone` in v2), Prisma migrations (stay on
  `db push`), billing, account deletion.

## Phasing

- **Phase 0 (hand, ~2–3h):** schema push · auth wiring (verify
  next-auth@beta × Next 16 on a preview deploy BEFORE grinding 24 stories
  on top) · `tenancy.ts` (grind) · claim script.
- **Phase 1 (grind):** 18 action stories — strictly one action + its test
  per story (batching tangles the mocks).
- **Phase 2 (grind):** 6 page stories + the llmCap story.
- **Phase 3:** cutover choreography (hand) · sign-out button (grind) ·
  name-threading (grind) · userId-required tightening (hand).

Estimated: 15–50 min of grinding + 3–5 h hand work/review/cutover.

## Risks

1. Deploy/claim ordering (build-embedded `db push`) — mitigated by the
   manual-push-first sequence; highest consequence (Eddie's live season).
2. `session.user.id` plumbing — cover in the tenancy story's test.
3. `allowDangerousEmailAccountLinking` is required or Eddie's first
   sign-in throws `OAuthAccountNotLinked` against the claimed row.
4. uploadPrizePhoto (SSRF + shared Blob namespace) — hand review.
5. Open sign-ups + LLM = spend risk — mitigated by the daily cap.

## Verification

- Two Google accounts on a preview deploy: each sees only its own data;
  account #2 starts empty and can create its own prize (proves
  de-singleton).
- IDOR replay: from B's session, call actions with A's ids → `{ok:false}`,
  count 0 — one action per pattern-class.
- Logged-out requests to all 6 pages redirect to `/signin`.
- Eddie survival checklist: lane count, check-in totals, streaks, season
  week, prize photo, reflection count all match a pre-migration snapshot;
  claim script re-run is a no-op.
- Full `pnpm test` under the Kiritimati pin (tenancy adds no time logic).
- Upload action rejects `http://169.254.169.254/` and `file:` URLs.
