import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { deleteAccount } from "@/app/actions/deleteAccount"
import { setWitnessPassphrase } from "@/app/actions/setWitnessPassphrase"
import { DELETE_CONFIRMATION } from "@/lib/deleteConfirmation"
import { MIN_WITNESS_PASSPHRASE_LENGTH } from "@/lib/validation"
import DeleteAccountPanel from "@/components/DeleteAccountPanel"
import WitnessPassphrasePanel from "@/components/WitnessPassphrasePanel"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  // Not getViewer: there is no account to manage without one, so a demo
  // visitor belongs at the sign-in screen rather than looking at a page about
  // deleting something they do not have.
  const session = await auth()
  if (!session?.user) redirect("/signin")

  // Whether a passphrase exists, never the hash itself.
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { witnessHash: true },
  })

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Signed in as{" "}
        <span className="text-zinc-300">{session.user.email}</span> with Google.
      </p>

      <WitnessPassphrasePanel
        isSet={Boolean(account?.witnessHash)}
        minLength={MIN_WITNESS_PASSPHRASE_LENGTH}
        setWitnessPassphrase={async (passphrase) => {
          "use server"
          return setWitnessPassphrase(passphrase)
        }}
      />

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
