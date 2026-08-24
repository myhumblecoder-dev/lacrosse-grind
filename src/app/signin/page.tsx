import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, signIn } from "@/auth"

export const dynamic = "force-dynamic"

export default async function SignInPage() {
  const session = await auth()
  if (session?.user) redirect("/")

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold">Lacrosse Grind</h1>
      <p className="text-sm text-zinc-500">
        Your season, your lanes, your boss battles. Sign in to start showing up.
      </p>
      <form
        action={async () => {
          "use server"
          await signIn("google", { redirectTo: "/" })
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-green-500 px-6 py-3 font-medium text-zinc-950 hover:bg-green-400"
        >
          Continue with Google
        </button>
      </form>

      {/* Said here, where the decision is made. The terms claim accounts
          belong to an adult; if that is never shown at sign-up it is a claim
          nobody agreed to. */}
      <p className="text-xs leading-relaxed text-zinc-500">
        By continuing you agree to our{" "}
        <Link href="/terms" className="text-zinc-300 underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-zinc-300 underline">
          Privacy Policy
        </Link>
        , and confirm you are 18 or over and the parent or guardian responsible
        for this account.
      </p>
    </main>
  )
}
