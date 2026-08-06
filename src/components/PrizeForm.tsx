"use client"

import { useState, useTransition } from "react"
import PrizePhotoInput, { type PrizePhotoSelection } from "@/components/PrizePhotoInput"

const MAX_REASONS = 10

interface PrizeFormProps {
  existingTitle?: string
  existingDescription?: string
  existingReasons?: string[]
  existingPhotoUrl?: string | null
  savePrize: (data: {
    title: string
    description: string
    reasons: string[]
  }) => Promise<unknown>
  /**
   * Uploads the chosen photo. Called AFTER savePrize resolves, because the
   * upload writes onto the Prize row — the row has to exist first. Optional so
   * the form still works without a photo path wired up.
   */
  uploadPhoto?: (formData: FormData) => Promise<unknown>
  onCancel?: () => void
}

export default function PrizeForm({
  existingTitle,
  existingDescription,
  existingReasons,
  existingPhotoUrl,
  savePrize,
  uploadPhoto,
  onCancel,
}: PrizeFormProps) {
  const [title, setTitle] = useState(existingTitle ?? "")
  const [description, setDescription] = useState(existingDescription ?? "")
  // One input per reason, keyed by position. Removing a row shifts the rest up,
  // so a test must assert on the remaining VALUES, never on a fixed testid.
  const [reasons, setReasons] = useState<string[]>(existingReasons ?? [])
  const [photo, setPhoto] = useState<PrizePhotoSelection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateReason(index: number, value: string) {
    setReasons((prev) => prev.map((r, i) => (i === index ? value : r)))
  }

  function removeReason(index: number) {
    setReasons((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Name the thing you want")
      return
    }

    startTransition(async () => {
      await savePrize({
        title: title.trim(),
        description: description.trim(),
        // Blank rows are scaffolding for typing, not content.
        reasons: reasons.map((r) => r.trim()).filter((r) => r.length > 0),
      })

      // Photo second, and only if one was chosen: uploadPrizePhoto updates the
      // Prize row, so it needs the row savePrize just created. One Save from
      // Eddie's side; two calls underneath.
      if (photo && uploadPhoto) {
        const formData = new FormData()
        if (photo.file) formData.set("photo", photo.file)
        if (photo.url) formData.set("photoUrl", photo.url)
        await uploadPhoto(formData)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="prize-title" className="text-sm font-medium">
          What are you playing for?
        </label>
        <input
          id="prize-title"
          data-testid="prize-title"
          type="text"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-100"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="prize-description" className="text-sm font-medium">
          Describe it
        </label>
        <textarea
          id="prize-description"
          data-testid="prize-description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setDescription(e.target.value)
          }
          className="min-h-[100px] rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-100"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Why I want it</span>
        {reasons.map((reason, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              data-testid={"prize-reason-" + index}
              type="text"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateReason(index, e.target.value)
              }
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-100"
            />
            <button
              type="button"
              aria-label={"Remove reason " + (index + 1)}
              onClick={() => removeReason(index)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
        {reasons.length < MAX_REASONS && (
          <button
            type="button"
            onClick={() => setReasons((prev) => [...prev, ""])}
            className="self-start rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Add a reason
          </button>
        )}
      </div>

      {uploadPhoto && (
        <PrizePhotoInput existingPhotoUrl={existingPhotoUrl} onChange={setPhoto} />
      )}

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
