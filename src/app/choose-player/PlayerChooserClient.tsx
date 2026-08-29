'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { switchPlayer } from '@/app/actions/switchPlayer'
import { playerLevel } from '@/lib/playerLevel'
import PlayerAvatar from '@/components/PlayerAvatar'
import ChoosePlayerAddModal from '@/components/ChoosePlayerAddModal'
import ChoosePlayerManagePanel from '@/components/ChoosePlayerManagePanel'

interface PlayerChooserClientProps {
  players: { id: string; name: string; defeats: number }[]
  manage: boolean
}

const PLAYER_CAP = 6

export default function PlayerChooserClient({ players, manage }: PlayerChooserClientProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  if (manage) {
    return (
      <ChoosePlayerManagePanel
        players={players}
        onManageDone={() => router.push('/choose-player')}
      />
    )
  }

  const pick = async (id: string) => {
    if (switching) return
    setSwitching(true)
    await switchPlayer(id)
    router.push('/')
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-center text-2xl font-semibold text-zinc-100">
        Who&apos;s grinding today?
      </h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => pick(player.id)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 hover:border-emerald-500 transition-colors"
          >
            <PlayerAvatar
              size={96}
              level={playerLevel(player.defeats).level}
              name={player.name}
            />
            <span className="text-sm font-medium text-zinc-100">{player.name}</span>
          </button>
        ))}
        {players.length < PLAYER_CAP && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-600 p-4 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <span className="text-3xl" aria-hidden>
              ＋
            </span>
            <span className="text-sm">Add player</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push('/choose-player?mode=manage')}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-700 p-4 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <span className="text-3xl" aria-hidden>
            ✎
          </span>
          <span className="text-sm">Edit</span>
        </button>
      </div>
      <ChoosePlayerAddModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
