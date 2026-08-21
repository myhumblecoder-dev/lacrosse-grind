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
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  session: { strategy: "database" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      if (pathname === "/signin") return true
      return !!auth?.user
    },
    session({ session, user }) {
      // Every scoped query keys off session.user.id — without this copy the
      // id is undefined and scoping silently matches nothing.
      session.user.id = user.id
      return session
    },
  },
  pages: { signIn: "/signin" },
})
