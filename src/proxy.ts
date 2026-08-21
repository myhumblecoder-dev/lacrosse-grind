import { auth } from "@/auth"

// The `authorized` callback in src/auth.ts is the actual gate; wrapping an
// empty handler makes NextAuth run it (redirecting signed-out visitors to
// /signin) on every matched request.
export default auth(() => {})

export const config = {
  // Everything except Auth.js's own routes, Next internals, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
