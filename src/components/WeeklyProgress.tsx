import React from 'react';

interface WeeklyProgressProps {
  hits: number;
  target: number;
}

/**
 * WeeklyProgress component displays a progress bar representing
 * the number of successful check-ins relative to a weekly target.
 */
export function WeeklyProgress({ hits, target }: WeeklyProgressProps) {
  const progressPercentage = Math.min((hits / target) * 100, 100);
  const isGoalReached = hits >= target;
  const barColorClass = isGoalReached ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>{hits} / {target} days this week</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
        <div
          data-testid="progress-bar"
          className={`h-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
