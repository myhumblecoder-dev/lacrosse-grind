'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renamePlayer } from '@/app/actions/renamePlayer'
import { deletePlayer } from '@/app/actions/deletePlayer'

interface ChoosePlayerManagePanelProps {
  players: { id: string; name: string }[]
  onManageDone: () => void
}

const RENAME_ERROR: Record<string, string> = {
  validation: 'Name is required',
  duplicate: 'This name is already used',
  'not-found': 'Player not found',
}

const DELETE_ERROR: Record<string, string> = {
  'confirmation-mismatch': "Name doesn't match",
  'last-player': 'You must have at least one player',
  'not-found': 'Player not found',
}

export default function ChoosePlayerManagePanel({
  players,
  onManageDone,
}: ChoosePlayerManagePanelProps) {
  const router = useRouter()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmValue, setConfirmValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const lastPlayer = players.length === 1
  const deleting = players.find((p) => p.id === deletingId)

  const startRename = (id: string, name: string) => {
    setRenamingId(id)
    setRenameValue(name)
    setError(null)
  }

  const saveRename = async () => {
    if (!renamingId) return
    const result = await renamePlayer(renamingId, renameValue)
    if (result.ok) {
      setRenamingId(null)
      setError(null)
      router.refresh()
      return
    }
    setError(RENAME_ERROR[result.error] ?? 'Something went wrong')
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    const result = await deletePlayer(deletingId, confirmValue)
    if (result.ok) {
      setDeletingId(null)
      setConfirmValue('')
      setError(null)
      router.refresh()
      return
    }
    setError(DELETE_ERROR[result.error] ?? 'Something went wrong')
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-100">Manage players</h2>
      <ul className="mt-4 space-y-2">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
          >
            {renamingId === player.id ? (
              <>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={40}
                  autoFocus
                  className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveRename}
                  className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-zinc-100">{player.name}</span>
                <button
                  type="button"
                  onClick={() => startRename(player.id, player.name)}
                  className="rounded px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingId(player.id)
                    setConfirmValue('')
                    setError(null)
                  }}
                  disabled={lastPlayer}
                  title={lastPlayer ? 'You must have at least one player' : undefined}
                  className="rounded px-3 py-1 text-sm text-red-400 disabled:opacity-40 hover:bg-zinc-800"
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={onManageDone}
        className="mt-6 rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        Done
      </button>

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeletingId(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold text-zinc-100">
              Delete {deleting.name}?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              This removes all of their lanes and season progress. It cannot be undone.
            </p>
            <label htmlFor="confirm-delete" className="mt-4 block text-sm text-zinc-300">
              Type this player&apos;s name to confirm
            </label>
            <input
              id="confirm-delete"
              type="text"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={confirmValue.length === 0}
                className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-red-500"
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
