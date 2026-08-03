"use client"

import { useState, useTransition } from "react"

interface LaneFormProps {
  createLane: (data: {
    name: string
    emoji: string
    targetPerWeek: number
  }) => Promise<unknown>
  onSubmit?: () => void
}

const DEFAULT_EMOJI = "🥍"

export default function LaneForm({ createLane, onSubmit }: LaneFormProps) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
  const [targetPerWeek, setTargetPerWeek] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    startTransition(async () => {
      await createLane({ name: name.trim(), emoji, targetPerWeek })
      setName("")
      setEmoji(DEFAULT_EMOJI)
      setTargetPerWeek(5)
      onSubmit?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="lane-name" className="text-sm font-medium">
          Lane name
        </label>
        <input
          id="lane-name"
          data-testid="lane-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded-md text-black"
          placeholder="e.g. Stick Skills"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="lane-emoji" className="text-sm font-medium">
            Emoji
          </label>
          <input
            id="lane-emoji"
            data-testid="lane-emoji-input"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={2}
            className="w-16 p-2 border rounded-md text-black"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lane-target" className="text-sm font-medium">
            Target / week
          </label>
          <input
            id="lane-target"
            data-testid="lane-target-input"
            type="number"
            min={1}
            max={7}
            value={targetPerWeek}
            onChange={(e) => setTargetPerWeek(Number(e.target.value))}
            className="w-20 p-2 border rounded-md text-black"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add Lane"}
      </button>
    </form>
  )
}
