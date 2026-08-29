import { auth } from "@/auth"
import { NextResponse } from "next/server"

// The app is public — signed-out visitors browse the demo season, so they are
// never gated (see src/auth.ts: no `authorized` callback on purpose). The one
// job here: a SIGNED-IN user with no active player picked yet lands on the
// chooser (epic 7 Netflix flow) instead of a page silently falling back to the
// oldest player.
const GATED_PATHS = ["/", "/lanes", "/prize", "/boss-battles", "/history"]

export default auth((request) => {
  const { pathname } = request.nextUrl
  const gated =
    GATED_PATHS.includes(pathname) ||
    GATED_PATHS.some((p) => p !== "/" && pathname.startsWith(`${p}/`))

  if (gated && request.auth?.user && !request.cookies.get("x-active-player-id")) {
    return NextResponse.redirect(new URL("/choose-player", request.url))
  }

  return NextResponse.next()
})

export const config = {
  // Everything except Auth.js's own routes, Next internals, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|avatars|favicon.ico).*)"],
}
