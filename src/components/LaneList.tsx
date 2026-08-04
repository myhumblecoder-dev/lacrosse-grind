"use client"

import { useState } from "react"

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

// Single-code-point icons (<= 2 UTF-16 units so they satisfy the schema's
// emoji .max(2)). Mirrors the LaneForm picker.
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

export default function LaneList({ lanes, updateLane, setActive, deleteLane }: LaneListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: "", emoji: "", targetPerWeek: 5 })

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
    <ol className="w-full space-y-3">
      {lanes.map((lane) => (
        <li key={lane.id} className="rounded-lg border p-4">
          {editingId === lane.id ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Name</label>
                <input
                  data-testid={`edit-name-${lane.id}`}
                  className="rounded-md border p-2 text-black"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Icon</label>
                <select
                  className="rounded-md border p-2 text-black"
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
                  className="w-20 rounded-md border p-2 text-black"
                  value={draft.targetPerWeek}
                  onChange={(e) => setDraft({ ...draft, targetPerWeek: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(lane.id)}
                  className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-md border px-3 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {lane.emoji}
                </span>
                <span className="text-lg font-medium">{lane.name}</span>
                <span className="text-xs text-zinc-400">{lane.targetPerWeek}×/wk</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    lane.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {lane.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => setActive(lane.id, !lane.isActive)}
                  className="font-medium text-blue-600 hover:text-blue-800"
                  aria-label={`Toggle ${lane.name}`}
                >
                  Toggle
                </button>
                <button
                  onClick={() => startEdit(lane)}
                  className="font-medium text-zinc-600 hover:text-black"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${lane.name}"? This also removes its check-ins and boss battles.`
                      )
                    ) {
                      deleteLane(lane.id)
                    }
                  }}
                  className="font-medium text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
