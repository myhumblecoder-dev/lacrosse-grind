import React from 'react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
        <span aria-hidden="true">🟢</span>
        <span>Start your streak</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
      <span aria-hidden="true">🔥</span>
      <span>{streak}</span>
    </span>
  );
}
