# PRD — lacrosse-grind

*Scope anchor. Exists to bound epic stories inside the MVP boundary. Keep lean.*

---

## 1. Problem

Eddie needs a private, gamified daily training companion that makes habit check-ins feel like a game — not a report card. Process-over-outcome: effort and consistency are the only metrics, never performance scores or deficit language.

---

## 2. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Player selects which training lanes are active and sets per-lane daily frequency target |
| FR-2 | Daily checklist: player self-reports completion of each lane's session (check-off) |
| FR-3 | Streak tracking: consecutive days a lane was hit; freeze tokens let the player bank one guilt-free miss |
| FR-4 | Boss Battle every 2 weeks per lane: a short skill-test the player describes in free text; AI classifies readiness (not a grade — a coach note) |
| FR-5 | Weekly reflection: player writes a free-text note; AI generates a brief coach summary sent to both Thomas and Eddie |
| FR-6 | AI coach-note for boss battles: uses Ollama (local) by default, Anthropic as env-flag fallback |
| FR-7 | Effort-framed language throughout: no "you missed," no deficit counters; honest skips are neutral |
| FR-8 | Load management is a scoring event: rest/sleep entries count as positive check-ins |

---

## 3. Non-Functional Requirements

| Concern | Posture |
|---|---|
| Stack | Next.js 16 App Router + TS + Tailwind + shadcn/ui + Prisma 6 + Postgres (Neon) + Vitest + GitHub Actions + Vercel |
| Auth | **Single-user, no auth** — Eddie is the sole user; no sign-in screen for MVP |
| AI | Flexible LLM helper (see §6.14 of planning-artifacts-contract): Ollama local by default, Anthropic opt-in via `LLM_PROVIDER` env |
| Privacy | No external telemetry; AI prompts are local by default |
| Performance | Pages render in < 2 s on Vercel free tier |
| Testing | Vitest + RTL, co-located tests; DB-mutating actions use mocked Prisma |

---

## 4. MVP Scope (in)

- Lane configuration (select lanes, set frequency)
- Daily check-in checklist with streak tracking + freeze tokens
- Boss battles every 2 weeks (free-text self-report + AI coach note)
- Weekly reflection entry + AI coach summary → sent as log entry (no push notifications for MVP)
- Effort-framed UI copy everywhere
- Load/rest check-ins count as hits

---

## 5. Out of Scope

- Auth / multi-user (single-user private app)
- Push notifications / Telegram integration (weekly summary is a UI page, not a message)
- Performance metrics, rep counters, video upload
- Social sharing, leaderboards
- Coach-assigned workouts (Eddie curates his own lanes)
- Payments, subscriptions
