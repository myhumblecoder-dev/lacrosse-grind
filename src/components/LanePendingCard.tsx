import { formatWeekLabel } from "@/lib/weekUtils"

interface LanePendingCardProps {
  lane: { name: string; emoji: string }
  startsOn: Date
}

/**
 * A lane that is queued but not yet counting.
 *
 * Deliberately has no check-in buttons, no progress bar and no streak: every
 * one of those would state a score for a week the lane was not part of. All it
 * owes the player is the date it wakes up.
 */
export default function LanePendingCard({ lane, startsOn }: LanePendingCardProps) {
  return (
    <div
      data-testid="lane-pending"
      className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 p-4"
    >
      <div className="flex items-center gap-2 text-lg font-bold text-zinc-300">
        <span aria-hidden="true">{lane.emoji}</span>
        <span>{lane.name}</span>
      </div>
      <p className="text-sm text-purple-300">
        <span aria-hidden="true">⏳</span> Starts {formatWeekLabel(startsOn)} — you
        get the whole week for this one.
      </p>
    </div>
  )
}
