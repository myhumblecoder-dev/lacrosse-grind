"use client"

import { useState, useTransition } from "react"

interface ReflectionFormProps {
  weekStarting: Date
  existingNote?: string
  existingCoachSummary?: string
  createReflection: (data: {
    weekStarting: Date
    playerNote: string
  }) => Promise<{ coachSummary?: string }>
}

export default function ReflectionForm({
  weekStarting,
  existingNote,
  existingCoachSummary,
  createReflection,
}: ReflectionFormProps) {
  const [note, setNote] = useState(existingNote ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [coachSummary, setCoachSummary] = useState<string | undefined>(existingCoachSummary)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!note.trim()) {
      setError("Share something about your eslint")
      // Note: The AC specifically asked for "Share something about your week"
      // but I will use the exact string from the AC requirements.
      setError("Share something about your week")
      return
    }

    startTransition(async () => {
      try {
        const result = await createReflection({
          weekStarting,
          playerNote: note,
        })
        if (result.coachSummary) {
          setCoachSummary(result.coachSummary)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save reflection")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="reflection-input" className="text-sm font-medium">
          Weekly Reflection
        </label>
        <textarea
          id="reflection-input"
          data-testid="reflection-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[150px] p-2 border rounded-md text-black"
          placeholder="How was your week?"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {coachSummary && (
        <div
          data-testid="coach-summary"
          className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800"
        >
          🧠 Coach says: {coachSummary}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Reflection"}
      </button>
    </form>
  )
}
