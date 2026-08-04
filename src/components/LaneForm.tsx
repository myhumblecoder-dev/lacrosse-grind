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

// Single-code-point emojis only (no variation selectors / ZWJ sequences) so every
// value is <= 2 UTF-16 units and satisfies the schema's `emoji` .max(2). Built from
// code points to avoid stray variation-selector bytes sneaking into the source.
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

const DEFAULT_EMOJI = String.fromCodePoint(EMOJI_OPTIONS[0].cp)

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
          className="rounded-md border p-2"
          placeholder="e.g. Stick Skills"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="lane-emoji" className="text-sm font-medium">
            Icon
          </label>
          <select
            id="lane-emoji"
            data-testid="lane-emoji-input"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="rounded-md border p-2"
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
            className="w-20 rounded-md border p-2"
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
        className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add Lane"}
      </button>
    </form>
  )
}
