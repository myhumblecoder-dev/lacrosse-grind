"use client"

import { useState, useTransition } from "react"
import { formatWeekLabel } from "@/lib/weekUtils"

interface FreezeOfferProps {
  laneId: string
  /** The missed day a freeze would bridge, ISO. */
  missedDate: string
  /** What the streak becomes once the gap is bridged. */
  streakIfRepaired: number
  freezesAvailable: number
  /** Named for the verb, not `useX` — an eslint hook-rule false positive. */
  spendFreeze: (laneId: string, date: Date) => Promise<{ ok: boolean } | void>
}

/**
 * The one place a banked freeze can be spent.
 *
 * Only rendered once Eddie has already checked in today, so repairing the past
 * reads as a reward for turning up rather than a way around it — and the day
 * is named rather than counted, because "Saturday" is something a kid can
 * remember and argue with.
 */
export default function FreezeOffer({
  laneId,
  missedDate,
  streakIfRepaired,
  freezesAvailable,
  spendFreeze,
}: FreezeOfferProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (freezesAvailable <= 0) return null

  const day = formatWeekLabel(new Date(missedDate))

  return (
    <div
      data-testid="freeze-offer"
      className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm"
    >
      <p className="text-sky-100">
        <span aria-hidden="true">❄️</span> You missed {day}. Spend a freeze to
        bridge it and take your streak to {streakIfRepaired}?
      </p>
      {error && (
        <p data-testid="freeze-offer-error" className="mt-2 text-amber-300">
          {error}
        </p>
      )}
      <button
        type="button"
        data-testid="use-freeze"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const result = await spendFreeze(laneId, new Date(missedDate))
            if (result && !result.ok) {
              setError("That day can't be bridged any more — give it a refresh.")
            }
          })
        }
        className="mt-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
      >
        {isPending
          ? "Freezing..."
          : `Use a freeze · ${freezesAvailable} left`}
      </button>
    </div>
  )
}
