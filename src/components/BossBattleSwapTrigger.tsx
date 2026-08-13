"use client"

import { useState } from "react"
import LaneSwapModal from "@/components/LaneSwapModal"

interface LaneInfo {
  id: string
  name: string
  emoji: string
}

interface BossBattleSwapTriggerProps {
  lane: LaneInfo
  inactiveLanes: LaneInfo[]
  swapState: { mustPickReplacement: boolean; canRetire: boolean; blocked: boolean }
  onSwapLane: (outLaneId: string, inLaneId?: string) => Promise<unknown>
}

/**
 * The moment a lane change is offered: right after Eddie logs a boss battle.
 *
 * A boss battle is the natural end of a chapter for that lane, so trading it
 * here reads as finishing something rather than quitting it. Nothing renders
 * when the season would not allow a change — an offer he cannot accept is
 * worse than no offer.
 *
 * Its own file rather than inline in the page, because `"use client"` applies
 * to a whole module: a client component cannot be declared inside a Server
 * Component file.
 */
export default function BossBattleSwapTrigger({
  lane,
  inactiveLanes,
  swapState,
  onSwapLane,
}: BossBattleSwapTriggerProps) {
  const [open, setOpen] = useState(false)

  if (swapState.blocked) return null

  return (
    <>
      <button
        type="button"
        data-testid={`trade-btn-${lane.id}`}
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        Trade this lane
      </button>

      {open && (
        <LaneSwapModal
          open={true}
          outLane={lane}
          inactiveLanes={inactiveLanes}
          mustPickReplacement={swapState.mustPickReplacement}
          canRetire={swapState.canRetire}
          onSwap={async (outLaneId, inLaneId) => {
            // A retire is not a swap to `undefined`.
            if (inLaneId) await onSwapLane(outLaneId, inLaneId)
            else await onSwapLane(outLaneId)
            setOpen(false)
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  )
}
