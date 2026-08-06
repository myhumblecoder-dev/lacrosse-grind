"use client"

import { useState } from "react"
import PrizeForm from "@/components/PrizeForm"
import PrizeDisplay from "@/components/PrizeDisplay"

interface PrizeSectionProps {
  prize: {
    title: string
    description: string | null
    reasons: string[]
    photoUrl: string | null
  } | null
  savePrize: (data: {
    title: string
    description: string
    reasons: string[]
  }) => Promise<unknown>
  deletePrize: () => Promise<unknown>
}

/**
 * Owns the view/edit toggle for the Prize.
 *
 * This wrapper exists because `PrizeDisplay` needs an `onEdit` callback, and
 * `/prize/page.tsx` is a server component — a server component can pass server
 * ACTIONS across the boundary but not client callbacks. So the boolean lives
 * here, on the client, and the page stays a plain data fetch.
 */
export default function PrizeSection({
  prize,
  savePrize,
  deletePrize,
}: PrizeSectionProps) {
  const [isEditing, setIsEditing] = useState(false)

  // No prize yet: the form IS the empty state, so a first visit lands straight
  // on "What are you playing for?" rather than a dead end.
  if (!prize) {
    return <PrizeForm savePrize={savePrize} />
  }

  if (isEditing) {
    return (
      <PrizeForm
        existingTitle={prize.title}
        existingDescription={prize.description ?? undefined}
        existingReasons={prize.reasons}
        savePrize={async (data) => {
          const result = await savePrize(data)
          setIsEditing(false)
          return result
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <PrizeDisplay
      title={prize.title}
      description={prize.description}
      reasons={prize.reasons}
      photoUrl={prize.photoUrl}
      onEdit={() => setIsEditing(true)}
      deletePrize={deletePrize}
    />
  )
}
