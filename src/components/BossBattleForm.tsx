"use client"

import { useState, useTransition } from "react"

interface BossBattleFormProps {
  laneId: string
  laneName: string
  weekStarting: Date
  existingReport?: string
  existingCoachNote?: string
  createBossBattle: (data: {
    laneId: string
    weekStarting: Date
    selfReport: string
  }) => Promise<{ coachNote?: string }>
}

export default function BossBattleForm({
  laneId,
  laneName,
  weekStarting,
  existingReport,
  existingCoachNote,
  createBossBattle,
}: BossBattleFormProps) {
  const [selfReport, setSelfReport] = useState(existingReport ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [coachNote, setCoachNote] = useState<string | undefined>(existingCoachNote)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selfReport.trim()) {
      setError("Tell me how it went first")
      return
    }

    startTransition(async () => {
      try {
        const result = await createBossBattle({
          laneId,
          weekStarting,
          selfReport: selfReport.trim(),
        })
        if (result.coachNote) {
          setCoachNote(result.coachNote)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit report")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="self-report-input" className="text-sm font-medium">
          {laneName} — Battle Report
        </label>
        <textarea
          id="self-report-input"
          data-testid="self-report-input"
          value={selfReport}
          onChange={(e) => setSelfReport(e.target.value)}
          className="min-h-[150px] p-2 border rounded-md text-black"
          placeholder="How did the battle go?"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {coachNote && (
        <div
          data-testid="coach-note"
          className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800"
        >
          🧠 Coach says: {coachNote}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Submit Battle Report"}
      </button>
    </form>
  )
}
