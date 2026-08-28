'use client'

import React, { useState } from 'react'

interface PlayerAvatarProps {
  level: number
  name: string
  size?: number
}

export default function PlayerAvatar({ level, name, size = 192 }: PlayerAvatarProps) {
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
      className="avatar-scanlines relative animate-avatar-blob motion-reduce:animate-none"
    >
      {hasError ? (
        <div
          data-testid="avatar-fallback"
          className="flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-center p-2"
          style={{ width: size, height: size }}
        >
          <span className="text-sm font-bold leading-tight">
            {name} {emoji}
          </span>
        </div>
      ) : (
        <img
          src={`/avatars/level-${level}.png`}
          alt={name}
          width={size}
          height={size}
          className="[image-rendering:pixelated] rounded-full object-cover"
          style={{ width: size, height: size }}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  )
}