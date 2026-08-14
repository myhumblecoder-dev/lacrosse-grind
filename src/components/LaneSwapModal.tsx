"use client"

import React, { useState, useTransition } from 'react'

interface LaneInfo {
  id: string
  name: string
  emoji: string
}

interface LaneSwapModalProps {
  open: boolean
  outLane: LaneInfo
  inactiveLanes: LaneInfo[]
  mustPickReplacement: boolean
  canRetire: boolean
  onSwap: (outLaneId: string, inLaneId?: string) => Promise<void>
  onCancel: () => void
}

export default function LaneSwapModal({
  open,
  outLane,
  inactiveLanes,
  mustPickReplacement,
  canRetire,
  onSwap,
  onCancel,
}: LaneSwapModalProps) {
  const [selectedInLaneId, setSelectedInLaneId] = useState('')
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        // A retire is not a swap to `undefined` — call with one argument so
        // the action takes its retire path rather than the swap path.
        if (selectedInLaneId) {
          await onSwap(outLane.id, selectedInLaneId)
        } else {
          await onSwap(outLane.id)
        }
      } catch (err) {
        console.error("Swap failed:", err)
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Trade out {outLane.emoji} {outLane.name}
        </h2>

        <div className="mt-6 space-y-4">
          {mustPickReplacement && inactiveLanes.length === 0 ? (
            <p className="text-sm text-zinc-500">No inactive lanes available</p>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="replacement-select"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Select a replacement lane:
              </label>
              <select
                id="replacement-select"
                data-testid="replacement-select"
                value={selectedInLaneId}
                onChange={(e) => setSelectedInLaneId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Pick a replacement lane</option>
                {inactiveLanes.map((lane) => (
                  <option key={lane.id} value={lane.id}>
                    {lane.emoji} {lane.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canRetire && (
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <input
                type="checkbox"
                id="retire-lane"
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedInLaneId('')
                  }
                }}
              />
              <label htmlFor="retire-lane" className="text-sm text-zinc-600 dark:text-zinc-400">
                Retire this lane instead
              </label>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-testid="cancel-swap"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-swap"
            onClick={handleConfirm}
            disabled={isPending || (mustPickReplacement && !selectedInLaneId)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {mustPickReplacement ? 'Confirm Swap' : 'Retire Lane'}
          </button>
        </div>
      </div>
    </div>
  )
}
