# Epic 3 — AI Layer

*LLM helper (Ollama local default / Anthropic opt-in) powering coach notes and weekly summaries.*

---

## Story 3.1 — LLM Helper Library

**Depends on:** (none)

**Files to create:**
- `src/lib/llm.ts`
- `src/lib/llm.test.ts`
- `.env.example`

**Acceptance Criteria:**
- `generate(prompt: string): Promise<string>` is the sole export from `src/lib/llm.ts`.
- Branches on `process.env.LLM_PROVIDER` (default `'ollama'`):
  - `'ollama'`: POST `${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/api/generate` with JSON body `{ model: process.env.OLLAMA_MODEL ?? 'gemma4:26b', prompt, stream: false }`; throw on `!res.ok`; return `(await res.json()).response`.
  - `'anthropic'`: POST `https://api.anthropic.com/v1/messages` with headers `{ 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }`; body `{ model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022', max_tokens: 512, messages: [{ role: 'user', content: prompt }] }`; throw on `!res.ok`; return `data.content[0].text`.
- Uses direct `fetch` for both providers; does NOT import Vercel AI SDK or any provider SDK.
- `.env.example` contains (in this order): `DATABASE_URL=""`, `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=gemma4:26b`, commented-out `# ANTHROPIC_API_KEY=""`, commented-out `# ANTHROPIC_MODEL=claude-3-5-haiku-20241022`.
- Implement `generate` exactly once; do NOT emit an alternate variant.
- `llm.test.ts` mocks global `fetch` via `vi.stubGlobal('fetch', vi.fn())` and covers: (see Testing section)

**Testing:**
- Test ollama provider returns response field
- Test anthropic provider returns content text
- Test ollama fetch throws on non-ok response
- Test anthropic fetch throws on non-ok response

Write ONLY these tests.
