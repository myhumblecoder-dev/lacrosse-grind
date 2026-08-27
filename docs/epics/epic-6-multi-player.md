# Epic 6 — Multi-Player Support

One account tracks multiple kids. A `Player` entity owns lanes and prize/season
state. Existing data migrates to a first auto-created Player. The UI gets an
active-player switcher. Players are private to the owning account.

---

## Story 11 — Player model: add Player to schema.prisma

Add the `Player` model to `prisma/schema.prisma`. Wire nullable `playerId` FKs
onto `Lane` and `Prize` (nullable = additive, no data loss on `db push`). Wire
`User.players` relation. Cascade-delete lanes and prizes when a player is
deleted.

**Files to modify:**
- `prisma/schema.prisma`

**Acceptance Criteria:**
- `Player` model added with fields: `id String @id @default(cuid())`, `userId String`, `name String`, `isDefault Boolean @default(false)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.
- `Player` has relation `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` and reverse `lanes Lane[]` and `prizes Prize[]`.
- `Player` has `@@index([userId])` and `@@unique([userId, name])`.
- `User` model gains `players Player[]` reverse relation.
- `Lane` model gains `playerId String?` column and `player Player? @relation(fields: [playerId], references: [id], onDelete: Cascade)`.
- `Prize` model gains `playerId String?` column and `player Player? @relation(fields: [playerId], references: [id], onDelete: Cascade)`.
- `Lane` gains `@@index([playerId, isActive])`.
- All existing models and fields are preserved unchanged.
- `export const dynamic = 'force-dynamic'` is not applicable here (schema file).

**Testing:** not applicable — Prisma schema file; there is no unit under test.

---

## Story 12 — Architecture doc: update data model section for Player

Update `docs/architecture.md` §2 data-model section to document the `Player`
model and the new nullable `playerId` columns on `Lane` and `Prize`. Also update
§3 file inventory to add the new action and component paths introduced by this
epic.

**Files to modify:**
- `docs/architecture.md`

**Acceptance Criteria:**
- §2 data model includes the full `Player` model Prisma block with all fields from Story 1.
- §2 notes that `Lane` and `Prize` each gain a nullable `playerId String?` column.
- §3 file inventory adds rows for: `src/app/actions/ensureDefaultPlayer.ts`, `src/app/actions/createPlayer.ts`, `src/app/actions/switchPlayer.ts`, `src/components/PlayerSwitcher.tsx`.
- No other sections of `docs/architecture.md` are altered.

**Testing:** not applicable — documentation file; there is no unit under test.

---

## Story 13 — ensureDefaultPlayer action

**Depends on:** Story 11

A `'use server'` action `ensureDefaultPlayer(): Promise<{ playerId: string }>`.
When the signed-in user has no `Player` rows, it creates one (`name: 'Player 1'`,
`isDefault: true`) and binds all existing orphan `Lane` and `Prize` rows to it.
When at least one player already exists, returns the first player's id without
writing anything.

**Files to create:**
- `src/app/actions/ensureDefaultPlayer.ts`
- `src/app/actions/ensureDefaultPlayer.test.ts`

**Acceptance Criteria:**
- `ensureDefaultPlayer(): Promise<{ playerId: string }>` is the SOLE export of `src/app/actions/ensureDefaultPlayer.ts`.
- Imports `{ prisma } from '@/lib/db'` and `{ requireUserId } from '@/lib/tenancy'`. Imports nothing from `next/cache`.
- When `prisma.player.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })` returns null: calls `prisma.player.create({ data: { userId, name: 'Player 1', isDefault: true } })`; then `prisma.lane.updateMany({ where: { userId, playerId: null }, data: { playerId: newPlayer.id } })`; then `prisma.prize.updateMany({ where: { userId, playerId: null }, data: { playerId: newPlayer.id } })`; returns `{ playerId: newPlayer.id }`.
- When `prisma.player.findFirst` returns an existing player: returns `{ playerId: existing.id }` without calling `prisma.player.create`, `prisma.lane.updateMany`, or `prisma.prize.updateMany`.
- Test file mocks `@/lib/db` and `@/lib/tenancy`. Does NOT mock `next/cache`.
- Each mock assertion checks the `where` and `data` args on SHORT separate lines: `expect(mock.X).toHaveBeenCalledOnce(); const arg = mock.X.mock.calls[0][0]; expect(arg.where).toEqual({...}); expect(arg.data).toEqual({...})`.

**Testing:**
- Test returns existing playerId without creating when player row exists
- Test creates player and binds orphan lanes when no players exist
- Test does not call player.create when player already exists

---

## Story 14 — Layout: call ensureDefaultPlayer for signed-in users

**Depends on:** Story 13

Modify `src/app/layout.tsx` to call `ensureDefaultPlayer()` for signed-in
users. This ensures every page load sees migrated state before rendering.
The call is fire-and-await; it does not change any prop passed to `AppShell`.

**Files to modify:**
- `src/app/layout.tsx`

**Acceptance Criteria:**
- After the existing `const session = await auth()` call, when `session?.user` is truthy, the layout adds `await ensureDefaultPlayer()` before the JSX `return`.
- Imports `{ ensureDefaultPlayer } from '@/app/actions/ensureDefaultPlayer'` at the top of the file.
- When `session?.user` is falsy (demo visitor), `ensureDefaultPlayer` is NOT called.
- `export const dynamic = 'force-dynamic'` is declared in this file.
- All existing props passed to `AppShell` remain unchanged.
- `src/app/layout.tsx` default-exports a React Server Component (async function `RootLayout`).

**Testing:**
- Test layout renders AppShell with signedIn false when no session
- Test layout renders AppShell with signedIn true when session exists

---

## Story 15 — Tenancy: add requirePlayerId helper

**Depends on:** Story 11

Add `requirePlayerId(userId: string): Promise<string>` to `src/lib/tenancy.ts`.
It reads the `x-active-player-id` cookie, validates ownership, and falls back
to the oldest player if the cookie is absent or names a foreign player. Redirects
to `'/'` only if no player rows exist at all.

**Files to modify:**
- `src/lib/tenancy.ts`
- `src/lib/tenancy.test.ts`

**Acceptance Criteria:**
- Exports `requirePlayerId(userId: string): Promise<string>` as a new named export from `src/lib/tenancy.ts`. `requireUserId` is unchanged. Implement `requirePlayerId` exactly once; do NOT emit an alternate variant or re-export.
- `requirePlayerId` imports `{ cookies } from 'next/headers'` and `{ redirect } from 'next/navigation'`. It imports `{ prisma } from '@/lib/db'`. It does NOT import `{ auth }`.
- If `(await cookies()).get('x-active-player-id')?.value` is a non-empty string, calls `prisma.player.findFirst({ where: { id: cookieValue, userId } })`; if the row exists, returns `row.id`.
- If the cookie is absent or the row is null, calls `prisma.player.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })`; if found, returns `row.id`.
- If that second query also returns null (no players at all), calls `redirect('/')`.
- `tenancy.test.ts` new test cases import ONLY `{ requirePlayerId }` from `./tenancy`. They mock `@/lib/db`, `next/headers` (`cookies`), and `next/navigation` (`redirect`). They do NOT mock `@/auth`.

**Testing:**
- Test returns cookie player id when cookie names an owned player
- Test falls back to oldest player when cookie is absent
- Test redirects when no player rows exist for userId

---

## Story 16 — createPlayer action

**Depends on:** Story 11

A `'use server'` action `createPlayer` that validates a player name and
persists a new `Player` row for the signed-in user.

**Files to create:**
- `src/app/actions/createPlayer.ts`
- `src/app/actions/createPlayer.test.ts`

**Acceptance Criteria:**
- `createPlayer(name: string): Promise<{ ok: true; id: string } | { ok: false; error: string }>` is the SOLE export of `src/app/actions/createPlayer.ts`.
- Imports `{ prisma } from '@/lib/db'` and `{ requireUserId } from '@/lib/tenancy'`. Imports `{ z } from 'zod'` for inline validation: `const nameSchema = z.string().trim().min(1).max(40)`.
- Calls `requireUserId()` first; then `nameSchema.safeParse(name)` — if `!parsed.success` returns `{ ok: false, error: 'validation' }`.
- On success: calls `prisma.player.create({ data: { userId, name: parsed.data, isDefault: false } })`; returns `{ ok: true, id: row.id }`. Implement `createPlayer` exactly once; do NOT emit an alternate variant or re-export.
- Test file mocks `@/lib/db` and `@/lib/tenancy`. Does NOT mock `next/cache`.

**Testing:**
- Test returns ok:false for empty name
- Test returns ok:false for whitespace-only name
- Test returns ok:true with row id for valid input

---

## Story 17 — Viewer: add getActivePlayerId and update getViewer

**Depends on:** Story 11

Update `src/lib/viewer.ts` so that `getViewer` returns a `playerId` alongside
the `userId`, and add a `getActivePlayerId` helper that reads the cookie and
validates ownership.

**Files to modify:**
- `src/lib/viewer.ts`
- `src/lib/viewer.test.ts`

**Acceptance Criteria:**
- Exports `getActivePlayerId(userId: string): Promise<string | null>` as a new named export from `src/lib/viewer.ts`. It imports `{ cookies } from 'next/headers'` and `{ prisma } from '@/lib/db'`. Reads `(await cookies()).get('x-active-player-id')?.value`; if present calls `prisma.player.findFirst({ where: { id: cookieValue, userId } })`; returns `row.id` if found, `null` otherwise. If cookie absent, returns `null`. Implement `getActivePlayerId` exactly once; do NOT emit an alternate variant or re-export.
- `Viewer` type updated: `{ kind: 'user'; userId: string; playerId: string } | { kind: 'demo' }`. Export the updated `Viewer` type.
- `getViewer` updated: after confirming the user row exists, calls `getActivePlayerId(userId)` to get `playerId`; if null, falls back to `prisma.player.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })?.id ?? ''`; returns `{ kind: 'user', userId, playerId }`.
- `getViewer` and `getActivePlayerId` are named exports of `src/lib/viewer.ts`; `Viewer` is an exported type.
- `viewer.test.ts` new test cases import `{ getViewer, getActivePlayerId }` from `./viewer`. They mock `@/lib/db`, `next/headers` (`cookies`). They do NOT re-mock `@/auth` (existing suite already mocks it). Tests use fully-typed mock fixtures (no `as any`).

**Testing:**
- Test getActivePlayerId returns null when cookie is absent
- Test getActivePlayerId returns playerId when cookie matches owned player
- Test getViewer returns demo when session has no user

---

## Story 18 — Scope createLane to active player

**Depends on:** Story 15

Update `src/app/actions/createLane.ts` to resolve the active player and include
`playerId` in the new lane's data.

**Files to modify:**
- `src/app/actions/createLane.ts`
- `src/app/actions/createLane.test.ts`

**Acceptance Criteria:**
- `createLane(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` remains the SOLE export of the file.
- Imports `{ requireUserId, requirePlayerId } from '@/lib/tenancy'`, `{ prisma } from '@/lib/db'`.
- After `requireUserId()`, `createLane` calls `requirePlayerId(userId)` and stores the result as `playerId`.
- `prisma.lane.create` is called with `data: { ...parsed.data, sortOrder: 0, userId, playerId, startsOn }`.
- The lane ownership check `prisma.lane.count({ where: { userId } })` remains unchanged (total count across all players).
- `createLane.test.ts` new test cases mock `@/lib/tenancy` to return `{ requireUserId: vi.fn().mockResolvedValue('u1'), requirePlayerId: vi.fn().mockResolvedValue('p1') }`. Assert `prisma.lane.create` received `playerId: 'p1'` using short-line assertions: `expect(mock.lane.create).toHaveBeenCalledOnce(); const arg = mock.lane.create.mock.calls[0][0]; expect(arg.data.playerId).toBe('p1')`.

**Testing:**
- Test lane create call includes playerId from requirePlayerId
- Test lane create is not called when validation fails

---

## Story 19 — Scope createCheckIn to active player

**Depends on:** Story 15

Update `src/app/actions/createCheckIn.ts` so the lane ownership lookup is
scoped to the active player, not just the userId.

**Files to modify:**
- `src/app/actions/createCheckIn.ts`
- `src/app/actions/createCheckIn.test.ts`

**Acceptance Criteria:**
- `createCheckIn(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }>` remains the SOLE export of the file.
- Imports `{ requireUserId, requirePlayerId } from '@/lib/tenancy'`, `{ prisma } from '@/lib/db'`.
- After `requireUserId()`, `createCheckIn` calls `requirePlayerId(userId)` and stores the result as `playerId`.
- The lane lookup changes from `prisma.lane.findFirst({ where: { id: laneId, userId } })` to `prisma.lane.findFirst({ where: { id: laneId, playerId } })`.
- All other logic (window check, upsert, revalidatePath) is unchanged.
- `createCheckIn.test.ts` new test cases mock `@/lib/tenancy` to return `{ requireUserId: vi.fn().mockResolvedValue('u1'), requirePlayerId: vi.fn().mockResolvedValue('p1') }`. Assert `prisma.lane.findFirst` was called with player scope using short-line assertions: `expect(mock.lane.findFirst).toHaveBeenCalledOnce(); const arg = mock.lane.findFirst.mock.calls[0][0]; expect(arg.where.playerId).toBe('p1')`.

**Testing:**
- Test lane lookup uses playerId from requirePlayerId
- Test returns not-found when lane belongs to different player

---

## Story 20 — Scope dashboard page to active player

**Depends on:** Story 17

Update `src/app/page.tsx` `loadDashboard` so all DB reads are scoped to
`viewer.playerId` instead of `viewer.userId`.

**Files to modify:**
- `src/app/page.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` is already declared and must remain.
- `loadDashboard` receives `viewer: Viewer` (updated type with `playerId`). For the `user` path: `prisma.prize.findUnique({ where: { playerId: viewer.playerId } })`; `prisma.lane.count({ where: { isActive: true, playerId: viewer.playerId } })`; `prisma.bossBattle.count({ where: { completedAt: { not: null }, lane: { playerId: viewer.playerId } } })`; `prisma.lane.findMany({ where: { isActive: true, playerId: viewer.playerId }, ... })`.
- All queries that previously used `{ userId }` now use `{ playerId: viewer.playerId }` for lane-scoped filters. The `viewer.userId` value is no longer passed to lane or prize queries.
- Demo path is unchanged.
- No new files are created.
- The existing `src/app/page.test.tsx` suite mocks `getViewer` — new test cases call `vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })`. Assert that `prisma.lane.findMany` is called with `where` containing `{ playerId: 'p1' }` using short-line assertions: `const arg = vi.mocked(prisma.lane.findMany).mock.calls[0][0]; expect(arg.where?.playerId).toBe('p1')`.

**Testing:**
- Test loadDashboard queries lanes by playerId not userId
- Test loadDashboard queries prize by playerId

---

## Story 21 — Scope lanes page to active player

**Depends on:** Story 17

Update `src/app/lanes/page.tsx` `loadLanes` so all DB reads are scoped to
`viewer.playerId`.

**Files to modify:**
- `src/app/lanes/page.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` is already declared and must remain.
- `loadLanes` receives `viewer: Viewer`. For the `user` path: `prisma.lane.findMany({ where: { playerId: viewer.playerId }, ... })`; `prisma.prize.findUnique({ where: { playerId: viewer.playerId } })`; `prisma.bossBattle.count({ where: { completedAt: { not: null }, lane: { playerId: viewer.playerId } } })`.
- All queries that previously used `{ userId }` now use `{ playerId: viewer.playerId }`.
- Demo path is unchanged.
- No new files are created.
- The existing `src/app/lanes/page.test.tsx` suite mocks `getViewer` — new test cases call `vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })`. Assert that `prisma.lane.findMany` is called with `where` containing `{ playerId: 'p1' }` using short-line assertions: `const arg = vi.mocked(prisma.lane.findMany).mock.calls[0][0]; expect(arg.where?.playerId).toBe('p1')`.

**Testing:**
- Test loadLanes queries lanes by playerId not userId
- Test loadLanes queries prize by playerId

---

## Story 22 — Scope prize page to active player

**Depends on:** Story 17

Update `src/app/prize/page.tsx` `loadPrize` so the prize and lane reads are
scoped to `viewer.playerId`.

**Files to modify:**
- `src/app/prize/page.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` is already declared and must remain.
- `loadPrize` receives `viewer: Viewer`. For the `user` path: `prisma.prize.findUnique({ where: { playerId: viewer.playerId } })`; `prisma.lane.findMany({ where: { playerId: viewer.playerId }, ... })`.
- The `prisma.prize.findUnique` previously used `{ where: { userId } }`; it now uses `{ where: { playerId: viewer.playerId } }`.
- All lane queries that previously used `{ userId }` now use `{ playerId: viewer.playerId }`.
- Demo path is unchanged.
- No new files are created.
- The existing `src/app/prize/page.test.tsx` suite mocks `getViewer` — new test cases call `vi.mocked(getViewer).mockResolvedValue({ kind: 'user', userId: 'u1', playerId: 'p1' })`. Assert that `prisma.prize.findUnique` is called with `where` containing `{ playerId: 'p1' }` using short-line assertions: `const arg = vi.mocked(prisma.prize.findUnique).mock.calls[0][0]; expect(arg.where?.playerId).toBe('p1')`.

**Testing:**
- Test loadPrize queries prize by playerId not userId
- Test loadPrize queries lanes by playerId

---

## Story 23 — switchPlayer action

**Depends on:** Story 11

A `'use server'` action that validates the requested player belongs to the signed-in
user, then sets the `x-active-player-id` cookie and revalidates the root path.

**Files to create:**
- `src/app/actions/switchPlayer.ts`
- `src/app/actions/switchPlayer.test.ts`

**Acceptance Criteria:**
- `switchPlayer(playerId: string): Promise<void>` is the SOLE export of `src/app/actions/switchPlayer.ts`.
- Imports `{ cookies } from 'next/headers'`, `{ revalidatePath } from 'next/cache'`, `{ prisma } from '@/lib/db'`, `{ requireUserId } from '@/lib/tenancy'`.
- Calls `requireUserId()` then `prisma.player.findFirst({ where: { id: playerId, userId } })`. If the row is null, returns without setting the cookie or calling `revalidatePath`.
- If the player row exists: calls `(await cookies()).set('x-active-player-id', playerId, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 31536000 })` then `revalidatePath('/')`.
- Test file mocks `@/lib/db`, `@/lib/tenancy`, `next/headers` (`cookies`), and `next/cache` (`revalidatePath`). Assertions use short lines: `expect(mockCookies.set).toHaveBeenCalledOnce(); const [name, val, opts] = mockCookies.set.mock.calls[0]; expect(name).toBe('x-active-player-id'); expect(val).toBe('p1'); expect(opts.httpOnly).toBe(true)`.

**Testing:**
- Test does not set cookie when player not found
- Test sets cookie with name and playerId when player is valid
- Test calls revalidatePath with slash when player is valid

---

## Story 24 — PlayerSwitcher component

**Depends on:** Story 23

A client component that renders a `<select>` for switching between players.
Renders null when there is only one player (no choice to make).

**Files to create:**
- `src/components/PlayerSwitcher.tsx`
- `src/components/PlayerSwitcher.test.tsx`

**Acceptance Criteria:**
- Default-exports a component named `PlayerSwitcher`. It is a `'use client'` component.
- Props interface: `players: { id: string; name: string }[]`, `activePlayerId: string`, `switchPlayer: (playerId: string) => Promise<void>`.
- When `players.length <= 1`, returns `null` — the component renders nothing.
- When `players.length >= 2`: renders a `<select data-testid="player-switcher">` whose `value` equals `activePlayerId`. Each player renders as `<option value={player.id}>{player.name}</option>`.
- `onChange` on the select calls `switchPlayer(e.target.value)`.
- Imports nothing from `@/lib/db` or `@/lib/tenancy`.
- Test file uses RTL. Does NOT use `vi.mock` for anything in `@/lib`.

**Testing:**
- Test renders null when players array has one entry
- Test renders select with all player names when two entries
- Test onChange calls switchPlayer with selected player id

---

## Story 25 — AppShell: add playerSwitcher prop slot

**Depends on:** Story 24

Add an optional `playerSwitcher?: React.ReactNode` prop to `AppShell`. Render it
in the header alongside the account control.

**Files to modify:**
- `src/components/AppShell.tsx`
- `src/components/AppShell.test.tsx`

**Acceptance Criteria:**
- `AppShell` accepts an optional `playerSwitcher?: React.ReactNode` prop. Default-exports a component named `AppShell`.
- The header renders `<div className="flex items-center gap-2">{playerSwitcher}{account}</div>` in place of the bare `{account}` node, so the switcher sits left of the account control.
- When `playerSwitcher` is undefined or null, the layout is visually unchanged (the flex wrapper renders an empty slot).
- `AppShell.test.tsx` new test: when `playerSwitcher={<span data-testid="switcher-slot">SW</span>}` is passed, `screen.getByTestId('switcher-slot')` is in the document.

**Testing:**
- Test playerSwitcher node is rendered in the header when provided
- Test header renders without error when playerSwitcher is undefined

---

## Story 26 — SidebarNav: add playerSwitcher prop slot

**Depends on:** Story 24

Add an optional `playerSwitcher?: React.ReactNode` prop to `SidebarNav`. Render
it in a padded block at the bottom of the nav column.

**Files to modify:**
- `src/components/SidebarNav.tsx`
- `src/components/SidebarNav.test.tsx`

**Acceptance Criteria:**
- `SidebarNav` accepts an optional `playerSwitcher?: React.ReactNode` prop. Default-exports a component named `SidebarNav`.
- Renders `<div className="px-4 py-2">{playerSwitcher}</div>` at the bottom of the `<aside>`, below the nav links.
- When `playerSwitcher` is undefined or null, the block renders but is visually empty (no layout shift).
- `SidebarNav.test.tsx` new test: when `playerSwitcher={<span data-testid="nav-switcher">NS</span>}` is passed, `screen.getByTestId('nav-switcher')` is in the document.

**Testing:**
- Test playerSwitcher node appears in nav when provided
- Test nav renders without error when playerSwitcher is undefined

---

## Story 27 — Layout: wire PlayerSwitcher into AppShell and SidebarNav

**Depends on:** Story 14, Story 25, Story 26

Update `src/app/layout.tsx` to fetch the player list and active player, then
pass a `<PlayerSwitcher>` through `AppShell`.

**Files to modify:**
- `src/app/layout.tsx`

**Acceptance Criteria:**
- `export const dynamic = 'force-dynamic'` is declared in this file.
- After the `auth()` call, when `session?.user` is truthy: fetches `const players = await prisma.player.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } })`; resolves `activePlayerId` as `(await cookies()).get('x-active-player-id')?.value ?? players[0]?.id ?? ''`.
- Imports `{ cookies } from 'next/headers'`, `{ prisma } from '@/lib/db'`, `PlayerSwitcher from '@/components/PlayerSwitcher'`, `{ switchPlayer } from '@/app/actions/switchPlayer'`.
- Passes `playerSwitcher={<PlayerSwitcher players={players} activePlayerId={activePlayerId} switchPlayer={switchPlayer} />}` to `AppShell`.
- When `session?.user` is falsy, `playerSwitcher` is not passed (undefined).
- `AppShell` also receives `playerSwitcher` forwarded to `SidebarNav` (the wiring between AppShell and SidebarNav is already specified in Stories 15–16; this story only concerns the layout-level fetch and prop assembly).
- `src/app/layout.tsx` default-exports an async React Server Component (`RootLayout`).

**Testing:**
- Test layout renders AppShell when session exists with player switcher
- Test layout renders AppShell when no session without player switcher
