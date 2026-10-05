"use client"

import { useState, useTransition } from "react"

interface WitnessPassphrasePanelProps {
  /** True when a passphrase already exists, so the copy reads as replacing it. */
  isSet: boolean
  minLength: number
  setWitnessPassphrase: (
    passphrase: string
  ) => Promise<{ ok: boolean; error?: string }>
}

/**
 * Set or replace the witness passphrase.
 *
 * Typed twice, because a write-only secret with a typo in it is discovered on
 * the night it is needed. Never asks for the current one: whoever is signed in
 * owns the account, and this guards against a kid on an unlocked device, not
 * against someone who already has the Google sign-in.
 *
 * `minLength` arrives as a prop so the crypto module never reaches the client
 * bundle.
 */
export default function WitnessPassphrasePanel({
  isSet,
  minLength,
  setWitnessPassphrase,
}: WitnessPassphrasePanelProps) {
  const [typed, setTyped] = useState("")
  const [confirmed, setConfirmed] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const longEnough = typed.length >= minLength
  const matches = typed.length > 0 && typed === confirmed
  const armed = longEnough && matches

  // Only once they have started on the second field: calling a half-typed
  // confirmation a mismatch is just nagging.
  const mismatch = confirmed.length > 0 && typed !== confirmed

  return (
    <div
      data-testid="witness-passphrase"
      className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4"
    >
      <h2 className="text-lg font-semibold text-zinc-100">
        {isSet ? "Change your amend passphrase" : "Set an amend passphrase"}
      </h2>
      <p className="text-sm text-zinc-400">
        This unlocks the amend page, where you can put a day on the record you
        watched happen, or take one off that did not. It is not a second
        account — anyone signed in with this Google account can change it here,
        so it is really just a speed bump between a kid holding an unlocked
        phone and his own week.
      </p>

      <label htmlFor="witness-passphrase-input" className="block text-sm text-zinc-400">
        Passphrase{" "}
        <span className="text-zinc-500">
          (at least {minLength} characters)
        </span>
      </label>
      <input
        id="witness-passphrase-input"
        data-testid="witness-passphrase-input"
        type="password"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value)
          setSaved(false)
        }}
        maxLength={200}
        autoComplete="new-password"
        className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 p-2"
      />

      <label htmlFor="witness-passphrase-confirm" className="block text-sm text-zinc-400">
        Type it again
      </label>
      <input
        id="witness-passphrase-confirm"
        data-testid="witness-passphrase-confirm"
        type="password"
        value={confirmed}
        onChange={(e) => {
          setConfirmed(e.target.value)
          setSaved(false)
        }}
        maxLength={200}
        autoComplete="new-password"
        className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 p-2"
      />

      {mismatch && (
        <p data-testid="witness-passphrase-error" className="text-sm text-amber-300">
          Those two don&apos;t match.
        </p>
      )}

      {!mismatch && error && (
        <p data-testid="witness-passphrase-error" className="text-sm text-amber-300">
          {error}
        </p>
      )}

      {saved && (
        <p data-testid="witness-passphrase-saved" className="text-sm text-green-300">
          Saved. You can amend this week from the History page.
        </p>
      )}

      <button
        type="button"
        data-testid="witness-passphrase-submit"
        disabled={!armed || isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            setSaved(false)
            try {
              const result = await setWitnessPassphrase(typed)
              if (result.ok) {
                setTyped("")
                setConfirmed("")
                setSaved(true)
              } else {
                setError("That didn't go through — give it another go.")
              }
            } catch {
              // React escalates a rejected transition to the nearest error
              // boundary, so without this the page crashes rather than saying
              // what went wrong.
              setError("Something went wrong — give it another go.")
            }
          })
        }
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Saving..." : isSet ? "Change passphrase" : "Set passphrase"}
      </button>
    </div>
  )
}
