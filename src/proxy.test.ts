import { describe, it, expect, vi } from 'vitest'

// auth(handler) is unwrapped so the gate logic is exercised directly; the
// wrapper itself is NextAuth I/O, not ours to test.
vi.mock('@/auth', () => ({ auth: (handler: unknown) => handler }))

import proxy from './proxy'

type GateRequest = Parameters<typeof proxy>[0]

function makeRequest(path: string, opts: { signedIn: boolean; cookie?: string }): GateRequest {
  return {
    nextUrl: new URL(`http://localhost${path}`),
    url: `http://localhost${path}`,
    auth: opts.signedIn ? { user: { id: 'u1' } } : null,
    cookies: {
      get: (name: string) =>
        name === 'x-active-player-id' && opts.cookie ? { name, value: opts.cookie } : undefined,
    },
  } as unknown as GateRequest
}

const call = proxy as unknown as (req: GateRequest) => Response | undefined

describe('proxy player gate', () => {
  it('redirects a signed-in user with no active-player cookie to /choose-player', () => {
    const res = call(makeRequest('/lanes', { signedIn: true }))
    expect(res?.status).toBeGreaterThanOrEqual(300)
    expect(res?.headers.get('location')).toContain('/choose-player')
  })

  it('passes a signed-in user whose cookie is set', () => {
    const res = call(makeRequest('/lanes', { signedIn: true, cookie: 'p1' }))
    expect(res?.headers.get('location') ?? '').not.toContain('/choose-player')
  })

  it('never gates a signed-out visitor (public demo)', () => {
    const res = call(makeRequest('/lanes', { signedIn: false }))
    expect(res?.headers.get('location') ?? '').not.toContain('/choose-player')
  })

  it('does not gate /choose-player itself', () => {
    const res = call(makeRequest('/choose-player', { signedIn: true }))
    expect(res?.headers.get('location') ?? '').not.toContain('/choose-player')
  })
})
