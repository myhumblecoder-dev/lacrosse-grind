import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { deleteAccount } from "@/app/actions/deleteAccount"
import { DELETE_CONFIRMATION } from "@/lib/deleteConfirmation"
import DeleteAccountPanel from "@/components/DeleteAccountPanel"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  // Not getViewer: there is no account to manage without one, so a demo
  // visitor belongs at the sign-in screen rather than looking at a page about
  // deleting something they do not have.
  const session = await auth()
  if (!session?.user) redirect("/signin")

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Signed in as{" "}
        <span className="text-zinc-300">{session.user.email}</span> with Google.
      </p>

      <DeleteAccountPanel
        confirmation={DELETE_CONFIRMATION}
        deleteAccount={async (confirmation) => {
          "use server"
          return deleteAccount(confirmation)
        }}
      />
    </main>
  )
}
