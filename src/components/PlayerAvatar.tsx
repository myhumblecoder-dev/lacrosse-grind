'use client'

import React, { useState } from 'react'

interface PlayerAvatarProps {
  level: number
  name: string
}

export default function PlayerAvatar({ level, name }: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false)

  const getEmoji = (lvl: number) => {
    if (lvl <= 2) return '🥚'
    if (lvl <= 5) return '🛡️'
    return '⚔️'
  }

  const emoji = getEmoji(level)

  return (
    <div
      data-testid="player-avatar"
      data-level={level}
      className="animate-avatar-bob motion-reduce:animate-none"
    >
      {hasError ? (
        <div
          data-testid="avatar-fallback"
          className="flex h-[192px] w-[192px] items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-center p-2"
        >
          <span className="text-sm font-bold leading-tight">
            {name} {emoji}
          </span>
        </div>
      ) : (
        <img
          src={`/avatars/level-${level}.png`}
          alt={name}
          width={192}
          height={192}
          className="[image-rendering:pixelated] h-[192px] w-[192px] rounded-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  )
}