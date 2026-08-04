"use client"

import { useState } from "react"
import ToggleSwitch from "@/components/ToggleSwitch"
import ConfirmModal from "@/components/ConfirmModal"

interface Lane {
  id: string
  name: string
  emoji: string
  isActive: boolean
  targetPerWeek: number
}

interface LaneListProps {
  lanes: Lane[]
  updateLane: (
    id: string,
    patch: { name?: string; emoji?: string; targetPerWeek?: number }
  ) => Promise<unknown>
  setActive: (id: string, isActive: boolean) => Promise<unknown>
  deleteLane: (id: string) => Promise<unknown>
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}

export default function LaneList({ lanes, updateLane, setActive, deleteLane }: LaneListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: "", emoji: "", targetPerWeek: 5 })
  const [confirmLane, setConfirmLane] = useState<Lane | null>(null)

  function startEdit(lane: Lane) {
    setEditingId(lane.id)
    setDraft({ name: lane.name, emoji: lane.emoji, targetPerWeek: lane.targetPerWeek })
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

  return (
    <>
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
                    <div className="text-xs text-zinc-500">{lane.targetPerWeek}×/week</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={lane.isActive}
                    onChange={(next) => setActive(lane.id, next)}
                    label={`Toggle ${lane.name}`}
                  />
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
        onConfirm={() => {
          if (confirmLane) deleteLane(confirmLane.id)
          setConfirmLane(null)
        }}
        onCancel={() => setConfirmLane(null)}
      />
    </>
  )
}
