"use client"

import React from 'react'
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
  today,
  createCheckIn,
  deleteCheckIn,
}: CheckInCardProps) {
  const date = new Date(today)

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span>{lane.emoji}</span>
          <span>{lane.name}</span>
          <StreakBadge streak={streak} />
        </div>
        {isRest && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
            Rest Day
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {checkedIn ? (
          <button
            onClick={() => deleteCheckIn(lane.id, date)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
          >
            Undo
          </button>
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