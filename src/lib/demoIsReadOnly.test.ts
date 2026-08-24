import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * The demo's safety argument, asserted rather than trusted.
 *
 * Reads and writes were both guarded by `requireUserId` before demo mode. The
 * whole design rests on those staying apart: pages may tolerate a missing
 * session, actions never may. These tests fail if that ever blurs.
 */
const ACTIONS_DIR = join(process.cwd(), "src/app/actions")

const actionFiles = readdirSync(ACTIONS_DIR).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")
)

// Actions that deliberately have no user to check: signing in and signing out
// are the two things a signed-out visitor is allowed to do.
const AUTH_ACTIONS = new Set(["promptSignIn.ts", "signOutAction.ts"])

describe("the demo cannot write", () => {
  it("finds the actions, so an empty glob cannot pass this file silently", () => {
    expect(actionFiles.length).toBeGreaterThan(10)
  })

  it.each(actionFiles.filter((f) => !AUTH_ACTIONS.has(f)))(
    "%s still demands a real session",
    (file) => {
      const source = readFileSync(join(ACTIONS_DIR, file), "utf8")

      expect(source).toContain("requireUserId")
    }
  )

  it.each(actionFiles)("%s never reaches for the demo-tolerant viewer", (file) => {
    // getViewer returns `demo` instead of redirecting. An action importing it
    // would hand a signed-out stranger a write.
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8")

    expect(source).not.toContain("getViewer")
    expect(source).not.toContain("demoSeason")
  })

  it("keeps requireUserId redirecting rather than returning a demo id", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/tenancy.ts"), "utf8")

    expect(source).toContain("redirect")
    expect(source).not.toContain("demo")
  })
})
