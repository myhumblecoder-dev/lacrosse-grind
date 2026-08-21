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
    </main>
  )
}
