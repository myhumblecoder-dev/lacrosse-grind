'use client'

import Link from 'next/link'
import PlayerAvatar from '@/components/PlayerAvatar'
import { playerLevel } from '@/lib/playerLevel'

interface HeaderPlayerChipProps {
  playerId: string
  playerName: string
  defeats: number
}

export default function HeaderPlayerChip({
  playerId,
  playerName,
  defeats,
}: HeaderPlayerChipProps) {
  const levelData = playerLevel(defeats)

  return (
    <Link
      href="/choose-player"
      className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200 transition-colors"
    >
      <PlayerAvatar size={32} level={levelData.level} name={playerName} />
      <span className="hidden sm:inline text-sm font-medium text-slate-900">
        {playerName}
      </span>
    </Link>
  )
}