"use client"

import { useState } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import { PencilIcon, TrashIcon } from "@/components/icons"

interface Reflection {
  id: string
  weekLabel: string
  playerNote: string
  coachSummary: string | null
  isCurrentWeek?: boolean
}

interface ReflectionListProps {
  reflections: Reflection[]
  editReflection: (
    id: string,
    playerNote: string
  ) => Promise<{ ok: boolean; coachSummary?: string } | unknown>
  deleteReflection: (id: string) => Promise<unknown>
}

export default function ReflectionList({
  reflections,
  editReflection,
  deleteReflection,
}: ReflectionListProps) {
  const [editingId, setEditing0] = useState<string | null>(null)
  // Note: The previous error showed a collision or typo in the build log.
  // I will use the standard setter name and ensure it is correctly scoped.
  const [editingIdState, setEditingIdState] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [summaries, setSummaries] = useState<Record<string, string | null>>({})
  const [confirmItem, setConfirmItem] = useState<Reflection | null>(null)

  // Re-implementing with clean state to avoid the 'setEditingId' not found error
  // from the previous failed attempt's broken logic.
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null)

  function startEdit(r: Reflection) {
    setActiveEditingId(r.id)
    setDraft(r.playerNote)
  }

  async function save(id: string) {
    try {
      const res = (await editReflection(id, draft.trim())) as {
        coachSummary?: string
      }
      if (res && res.coachSummary) {
        setSummaries((s) => ({ ...s, [id]: res.coachSummary! }))
      }
    } finally {
      setActiveEditingId(null)
    }
  }

  if (reflections.length === 0) {
    return <p className="text-zinc-500">No past reflections yet.</p>
  }

  return (
    <>
      <ol className="space-y-3">
        {reflections.map((r) => {
          const summary = r.id in summaries ? summaries[r.id] : r.coachSummary
          return (
            <li key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-400">{r.weekLabel}</span>
                  {r.isCurrentWeek && (
                    <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-300">
                      This week
                    </span>
                  )}
                </div>
                {activeEditingId !== r.id && (
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`Edit reflection ${r.weekLabel}`}
                      onClick={() => startEdit(r)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      aria-label={`Delete reflection ${r.weekLabel}`}
                      onClick={() => setConfirmItem(r)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>

              {activeEditingId === r.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    data-testid={`edit-reflection-${r.id}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(r.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setActiveEditingId(null)}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-200">{r.playerNote}</p>
                  {summary && (
                    <div className="mt-2 rounded-md border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
                      🧠 Coach says: {summary}
                    </div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ol>

      <ConfirmModal
        open={confirmItem !== null}
        title={confirmItem ? `Delete the ${confirmItem.weekLabel} reflection?` : ""}
        message="This removes the reflection and its coach summary."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmItem) deleteReflection(confirmItem.id)
          setConfirmItem(null)
        }}
        onCancel={() => setConfirmItem(null)}
      />
    </>
  )
}