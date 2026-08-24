"use client"

import { useState, useTransition } from "react"

interface DeleteAccountPanelProps {
  /** The word that has to be typed before the button will do anything. */
  confirmation: string
  deleteAccount: (confirmation: string) => Promise<{ ok: boolean; error?: string } | void>
}

/**
 * The only way out, and deliberately a slow one.
 *
 * Typing the word rather than clicking through a dialog: this removes a
 * season of someone's training and cannot be undone, so it should be
 * impossible to do by accident or by muscle memory.
 */
export default function DeleteAccountPanel({
  confirmation,
  deleteAccount,
}: DeleteAccountPanelProps) {
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const armed = typed.trim() === confirmation

  return (
    <div
      data-testid="delete-account"
      className="space-y-3 rounded-lg border border-red-500/40 bg-red-500/5 p-4"
    >
      <h2 className="text-lg font-semibold text-red-200">Delete this account</h2>
      <p className="text-sm text-zinc-400">
        This removes the whole season — every lane, every day you showed up,
        every boss you beat, the prize and its photo. It cannot be undone, and
        there is no copy kept.
      </p>

      <label htmlFor="delete-confirm" className="block text-sm text-zinc-400">
        Type <span className="font-semibold text-zinc-100">{confirmation}</span>{" "}
        to confirm
      </label>
      <input
        id="delete-confirm"
        data-testid="delete-confirm-input"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 p-2 font-mono"
      />

      {error && (
        <p data-testid="delete-account-error" className="text-sm text-amber-300">
          {error}
        </p>
      )}

      <button
        type="button"
        data-testid="delete-account-submit"
        disabled={!armed || isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            try {
              const result = await deleteAccount(typed.trim())
              // Success leaves by redirect, so anything returned is a refusal.
              if (result && !result.ok) {
                setError("That didn't go through — give it another go.")
              }
            } catch {
              // React escalates a rejected transition to the nearest error
              // boundary, so without this the page crashes rather than saying
              // what went wrong. The redirect on success is thrown too, but
              // Next handles that before it reaches here.
              setError("Something went wrong — give it another go.")
            }
          })
        }
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Deleting..." : "Delete my account"}
      </button>
    </div>
  )
}
