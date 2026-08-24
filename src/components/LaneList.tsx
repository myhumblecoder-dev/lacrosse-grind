"use client"

import { useState } from "react"
import { LANES_REQUIRED } from "@/lib/season"
import { isLanePending } from "@/lib/lanePending"
import { formatWeekLabel } from "@/lib/weekUtils"
import { effectiveTarget } from "@/lib/effectiveTarget"
import ToggleSwitch from "@/components/ToggleSwitch"
import ConfirmModal from "@/components/ConfirmModal"
import LaneSwapModal from "@/components/LaneSwapModal"
import { PencilIcon, TrashIcon } from "@/components/icons"

interface Lane {
  id: string
  name: string
  emoji: string
  isActive: boolean
  targetPerWeek: number
  /** Absent or null means the lane has always been running. */
  startsOn?: Date | null
  /** Effective-dated target changes; a future one is shown as scheduled. */
  targetChanges?: { target: number; effectiveFrom: Date }[]
}

interface LaneListProps {
  lanes: Lane[]
  updateLane: (
    id: string,
    patch: { name?: string; emoji?: string; targetPerWeek?: number }
  ) => Promise<unknown>
  setActive: (id: string, isActive: boolean) => Promise<unknown>
  deleteLane: (id: string) => Promise<unknown>
  onSwapLane: (outLaneId: string, inLaneId?: string) => Promise<unknown>
  requiredLanes?: number
  swapState: { mustPickReplacement: boolean; canRetire: boolean; blocked: boolean }
  inactiveLanes: { id: string; name: string; emoji: string }[]
  /** Monday of the current week — decides which lanes are still queued. */
  weekStart: Date
  /** A running season refuses deletes; the lane must be retired via Swap. */
  seasonRunning?: boolean
}

/** The soonest target change that has not taken effect yet, if any. */
function nextChange(lane: Lane, weekStart: Date) {
  const upcoming = (lane.targetChanges ?? [])
    .filter((c) => c.effectiveFrom.getTime() > weekStart.getTime())
    .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())
  return upcoming[0] ?? null
}

function scheduledTarget(lane: Lane, weekStart: Date) {
  return nextChange(lane, weekStart)?.target ?? null
}

const EMOJI_OPTIONS: { cp: number; label: string }[] = [
  { cp: 0x1f94d, label: "Lacrosse" },
  { cp: 0x1f3c3, label: "Running" },
  { cp: 0x1f3cb, label: "Weights" },
  { cp: 0x1f4aa, label: "Strength" },
  { cp: 0x1f3af, label: "Shooting" },
  { cp: 0x1f945, label: "Goals" },
  { cp: 0x1f938, label: "Agility" },
  { cp: 0x26a1, label: "Speed" },
  { cp: 0x1f9e0, label: "Film / Mental" },
  { cp: 0x1f634, label: "Recovery" },
  { cp: 0x1f525, label: "Conditioning" },
]

export default function LaneList({
  lanes,
  updateLane,
  setActive,
  deleteLane,
  onSwapLane,
  swapState,
  inactiveLanes,
  requiredLanes,
  weekStart,
  seasonRunning = false,
}: LaneListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: "", emoji: "", targetPerWeek: 5 })
  const [confirmLane, setConfirmLane] = useState<Lane | null>(null)
  // Set only when the server refuses a delete we thought was allowed.
  const [deleteBlocked, setDeleteBlocked] = useState<Lane | null>(null)
  // One modal shared by every row: `swapLane` is the lane being traded out.
  const [swapLane, setSwapLane] = useState<Lane | null>(null)

  function startEdit(lane: Lane) {
    setEditingId(lane.id)
    setDraft({
      name: lane.name,
      emoji: lane.emoji,
      // Seed with the queued target if one is waiting, so reopening the form
      // shows what the lane is becoming rather than what it is leaving behind.
      targetPerWeek:
        scheduledTarget(lane, weekStart) ??
        effectiveTarget(lane.targetChanges, weekStart, lane.targetPerWeek),
    })
  }

  async function saveEdit(id: string) {
    try {
      await updateLane(id, {
        name: draft.name.trim(),
        emoji: draft.emoji,
        targetPerWeek: draft.targetPerWeek,
      })
    } finally {
      setEditingId(null)
    }
  }

  if (lanes.length === 0) {
    return <p className="text-zinc-500">No lanes yet — add one below.</p>
  }

  const activeCount = lanes.filter((l) => l.isActive).length
  const displayRequired = requiredLanes ?? LANES_REQUIRED

  return (
    <>
      <div data-testid="lane-count" className="mb-4 text-sm font-medium text-zinc-400">
        {activeCount} of {displayRequired} lanes active
      </div>
      <ol className="w-full space-y-3">
        {lanes.map((lane) => (
          <li key={lane.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            {editingId === lane.id ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Name</label>
                  <input
                    data-testid={`edit-name-${lane.id}`}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-2"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Icon</label>
                  <select
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-2"
                    value={draft.emoji}
                    onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                  >
                    {EMOJI_OPTIONS.map((o) => {
                      const ch = String.fromCodePoint(o.cp)
                      return (
                        <option key={o.cp} value={ch}>
                          {ch} {o.label}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Target/wk</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 p-2"
                    value={draft.targetPerWeek}
                    onChange={(e) => setDraft({ ...draft, targetPerWeek: Number(e.target.value) })}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(lane.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {lane.emoji}
                  </span>
                  <div>
                    <div className="font-medium text-zinc-100">{lane.name}</div>
                    <div className="text-xs text-zinc-500">
                      {effectiveTarget(lane.targetChanges, weekStart, lane.targetPerWeek)}
                      ×/week
                    </div>
                    {scheduledTarget(lane, weekStart) !== null && (
                      <div
                        data-testid={`lane-target-scheduled-${lane.id}`}
                        className="text-xs text-purple-300"
                      >
                        → {scheduledTarget(lane, weekStart)}×/week from{" "}
                        {formatWeekLabel(nextChange(lane, weekStart)!.effectiveFrom)}
                      </div>
                    )}
                    {lane.isActive && isLanePending(lane.startsOn, weekStart) && (
                      <div
                        data-testid={`lane-starts-${lane.id}`}
                        className="text-xs text-purple-300"
                      >
                        starts {formatWeekLabel(lane.startsOn!)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={lane.isActive}
                    onChange={(next) => setActive(lane.id, next)}
                    label={`Toggle ${lane.name}`}
                  />
                  {!swapState.blocked && (
                    <button
                      data-testid={`swap-btn-${lane.id}`}
                      aria-label={`Swap ${lane.name}`}
                      onClick={() => setSwapLane(lane)}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      Swap
                    </button>
                  )}
                  <button
                    aria-label={`Edit ${lane.name}`}
                    onClick={() => startEdit(lane)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    aria-label={`Delete ${lane.name}`}
                    onClick={() => setConfirmLane(lane)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      <ConfirmModal
        open={confirmLane !== null}
        title={confirmLane ? `Delete "${confirmLane.name}"?` : ""}
        message="This also removes its check-ins and boss battles."
        confirmLabel="Delete"
        blocked={seasonRunning}
        blockedMessage={
          "Can't delete during a running season — its check-ins are part of " +
          "your season record. Use Swap to retire it instead."
        }
        altLabel="Use Swap"
        onAlt={() => {
          setSwapLane(confirmLane)
          setConfirmLane(null)
        }}
        onConfirm={async () => {
          const lane = confirmLane
          setConfirmLane(null)
          if (!lane) return
          // The pre-emptive block above can go stale if a season starts in
          // another tab, so the action's own refusal is honoured too rather
          // than the click quietly doing nothing.
          const result = (await deleteLane(lane.id)) as
            | { ok: boolean; error?: string }
            | undefined
          if (result && !result.ok && result.error === "season-running") {
            setDeleteBlocked(lane)
          }
        }}
        onCancel={() => setConfirmLane(null)}
      />

      <ConfirmModal
        open={deleteBlocked !== null}
        title={deleteBlocked ? `Delete "${deleteBlocked.name}"?` : ""}
        blocked
        blockedMessage={
          "Can't delete during a running season — its check-ins are part of " +
          "your season record. Use Swap to retire it instead."
        }
        altLabel="Use Swap"
        onAlt={() => {
          setSwapLane(deleteBlocked)
          setDeleteBlocked(null)
        }}
        onConfirm={() => setDeleteBlocked(null)}
        onCancel={() => setDeleteBlocked(null)}
      />

      {swapLane && (
        <LaneSwapModal
          open={true}
          outLane={{ id: swapLane.id, name: swapLane.name, emoji: swapLane.emoji }}
          inactiveLanes={inactiveLanes}
          mustPickReplacement={swapState.mustPickReplacement}
          canRetire={swapState.canRetire}
          onSwap={async (outLaneId, inLaneId) => {
            // A retire is not a swap to `undefined`: pass one argument so the
            // action takes its retire path.
            if (inLaneId) await onSwapLane(outLaneId, inLaneId)
            else await onSwapLane(outLaneId)
            setSwapLane(null)
          }}
          onCancel={() => setSwapLane(null)}
        />
      )}
    </>
  )
}
