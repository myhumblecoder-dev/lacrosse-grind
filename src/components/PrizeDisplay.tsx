"use client"

import { useState } from "react"
import Image from "next/image"
import { PencilIcon, TrashIcon } from "@/components/icons"
import ConfirmModal from "@/components/ConfirmModal"

interface PrizeDisplayProps {
  title: string
  description?: string | null
  reasons: string[]
  photoUrl?: string | null
  onEdit: () => void
  deletePrize: () => Promise<unknown>
}

export default function PrizeDisplay({
  title,
  description,
  reasons,
  photoUrl,
  onEdit,
  deletePrize,
}: PrizeDisplayProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleDeleteAction = async () => {
    try {
      await deletePrize()
      setIsConfirmOpen(false)
    } catch (err) {
      setIsConfirmOpen(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label="Edit prize"
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => setIsConfirmOpen(true)}
            aria-label="Delete prize"
            className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {photoUrl && (
        <div className="mt-4 overflow-hidden rounded-xl">
          <Image
            src={photoUrl}
            alt={title}
            width={640}
            height={480}
            className="rounded-xl object-cover"
          />
        </div>
      )}

      {reasons.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Why I want it
          </h3>
          <ul className="mt-2 space-y-1">
            {reasons.map((reason, index) => (
              <li key={index} className="text-sm text-zinc-400">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmModal
        open={isConfirmOpen}
        title="Delete your prize?"
        message="This removes the prize, its reasons and its photo from the page."
        confirmLabel="Delete"
        onConfirm={handleDeleteAction}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  )
}
