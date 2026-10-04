"use client"

import React from 'react'
import Link from 'next/link'
import { StreakBadge } from '@/components/StreakBadge'

interface CheckInCardProps {
  lane: {
    id: string
    name: string
    emoji: string
  }
  streak: number
  checkedIn: boolean
  isRest: boolean
  /**
   * True when a witness put today on the record rather than the player.
   *
   * Undo asks for no passphrase and leaves no removal log, so it is not the way
   * an attestation comes back off — `deleteCheckIn` refuses one. Without this
   * the card would render a button that silently does nothing.
   */
  isAttested?: boolean
  today: string
  createCheckIn: (params: {
    laneId: string
    date: Date
    isRest: boolean
  }) => void
  deleteCheckIn: (laneId: string, date: Date) => void
}

export default function CheckInCard({
  lane,
  streak,
  checkedIn,
  isRest,
  isAttested = false,
  today,
  createCheckIn,
  deleteCheckIn,
}: CheckInCardProps) {
  const date = new Date(today)

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-zinc-900 text-zinc-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span>{lane.emoji}</span>
          <span>{lane.name}</span>
          <StreakBadge streak={streak} />
        </div>
        <div className="flex items-center gap-2">
          {isAttested && (
            <span
              data-testid="attested-badge"
              className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-200"
            >
              Witnessed
            </span>
          )}
          {isRest && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
              Rest Day
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {checkedIn ? (
          isAttested ? (
            <p data-testid="attested-note" className="text-sm text-zinc-400">
              Put on the record by whoever was there. Change it on the{" "}
              <Link href="/amend" className="underline hover:text-zinc-200">
                amend page
              </Link>
              .
            </p>
          ) : (
            <button
              onClick={() => deleteCheckIn(lane.id, date)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
            >
              Undo
            </button>
          )
        ) : (
          <>
            <button
              onClick={() =>
                createCheckIn({
                  laneId: lane.id,
                  date,
                  isRest: false,
                })
              }
              disabled={checkedIn}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              I showed up
            </button>
            <button
              onClick={() =>
                createCheckIn({
                  laneId: lane.id,
                  date,
                  isRest: true,
                })
              }
              disabled={checkedIn}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Rest day
            </button>
          </>
        )}
      </div>
    </div>
  )
}