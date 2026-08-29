'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPlayer } from '@/app/actions/createPlayer'

interface ChoosePlayerAddModalProps {
  open: boolean
  onClose: () => void
}

const ERROR_TEXT: Record<string, string> = {
  validation: 'Name is required',
  duplicate: 'This name is already used',
  cap: "You've reached the 6-player limit",
}

export default function ChoosePlayerAddModal({ open, onClose }: ChoosePlayerAddModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const trimmed = name.trim()

  const submit = async () => {
    setBusy(true)
    setError(null)
    const result = await createPlayer(trimmed)
    setBusy(false)
    if (result.ok) {
      setName('')
      router.refresh()
      onClose()
      return
    }
    setError(ERROR_TEXT[result.error] ?? 'Something went wrong')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Add a player</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kid's name"
          maxLength={40}
          autoFocus
          className="mt-4 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={trimmed.length === 0 || busy}
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-emerald-500"
          >
            Add player
          </button>
        </div>
      </div>
    </div>
  )
}
