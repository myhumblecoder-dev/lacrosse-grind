import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email-linking is safe here (Google verifies emails) and load-bearing:
    // the claim script pre-creates the owner's User row, and this lets the
    // first Google sign-in attach to it instead of throwing
    // OAuthAccountNotLinked.
    Google({
      allowDangerousEmailAccountLinking: true,
      // A returning user gets the one-tap account chooser, not the full
      // consent screen (the provider default is prompt=consent).
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  // JWT sessions: a signed 30-day rolling cookie the proxy can verify
  // WITHOUT a database read. Database sessions were unreadable in the
  // proxy layer, so every fresh visit bounced to /signin despite a valid
  // cookie. The Prisma adapter still stores users/accounts; only session
  // storage moves into the cookie.
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      if (pathname === "/signin") return true
      return !!auth?.user
    },
    session({ session, token }) {
      // Every scoped query keys off session.user.id — without this copy the
      // id is undefined and scoping silently matches nothing. With JWT
      // sessions the id rides in token.sub.
      if (token?.sub) session.user.id = token.sub
      return session
    },
  },
  pages: { signIn: "/signin" },
})
