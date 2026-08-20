'use client'

import { useState } from 'react'
import { resetSeason } from '@/app/actions/resetSeason'

export default function SeasonResetButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      await resetSeason()
      setIsOpen(false)
    } catch (err) {
      // Error handling as per project rules
      console.error(err instanceof Error ? err.message : 'Failed to reset season')
    } finally {
      setIsPending(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        data-testid="season-reset-open"
        onClick={() => setIsOpen(true)}
        className="text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        Reset my season
      </button>

      {isOpen && (
        <div
          data-testid="season-reset-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900">
              Reset your season?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              This clears your season start date. Your check-ins and streaks are kept. The 13-week grid starts over when you press START again.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-testid="season-reset-cancel"
                onClick={handleCancel}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Keep my season
              </button>
              <button
                type="button"
                data-testid="season-reset-confirm"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isPending ? 'Resetting...' : 'Yes, reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}