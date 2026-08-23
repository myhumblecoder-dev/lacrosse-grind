'use client';

import React, { useState } from 'react';

type BossChallengeCardProps = {
  challenge: string | null;
  rerollsLeft: number;
  completedAt: Date | null;
  coachNote: string | null;
  onFace: () => Promise<void>;
  onReroll: () => Promise<void>;
  onComplete: () => Promise<{ leveledUp?: boolean; newLevel?: number; levelName?: string } | void>;
};

export default function BossChallengeCard({
  challenge,
  rerollsLeft,
  completedAt,
  coachNote,
  onFace,
  onReroll,
  onComplete,
}: BossChallengeCardProps) {
  const [celebration, setCelebration] = useState<{ level: number; name: string } | null>(null);

  const handleComplete = async () => {
    const result = await onComplete();
    if (result?.leveledUp && result.newLevel && result.levelName) {
      setCelebration({ level: result.newLevel, name: result.levelName });
    }
  };
  // State 1: No challenge exists yet
  if (challenge === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => onFace()}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          data-testid="face-boss"
        >
          Face the boss
        </button>
      </div>
    );
  }

  // State 2: Challenge is active (not completed)
  if (completedAt === null) {
    return (
      <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* The burst lives in BOTH the active and defeated branches: right
            after "I beat it" the props haven't revalidated yet, and the
            celebration must not wait for the server round-trip. */}
        {celebration && (
          <div
            data-testid="level-up-burst"
            className="animate-level-up-pop absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 font-bold text-emerald-600"
          >
            LEVEL UP! {celebration.name.toUpperCase()}
          </div>
        )}
        <p
          className="mb-4 text-sm font-medium text-slate-600"
          data-testid="boss-challenge"
        >
          {challenge}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleComplete()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            data-testid="beat-boss"
          >
            I beat it
          </button>

          {rerollsLeft > 0 && (
            <button
              type="button"
              onClick={() => onReroll()}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              data-testid="reroll-boss"
            >
              Different challenge
            </button>
          )}
        </div>
      </div>
    );
  }

  // State 3: Boss has been defeated
  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      {/* celebration state is only ever set by a successful completion —
          it IS the defeated proof, and gating on the completedAt prop would
          hide the burst until the server round-trip re-renders. */}
      {celebration && (
        <div
          data-testid="level-up-burst"
          className="animate-level-up-pop absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 font-bold text-emerald-600"
        >
          LEVEL UP! {celebration.name.toUpperCase()}
        </div>
      )}
      <p
        className="text-sm font-bold text-slate-700"
        data-testid="boss-defeated"
      >
        Boss defeated! {challenge}
      </p>

      {coachNote && (
        <p
          className="mt-2 text-sm italic text-slate-600"
          data-testid="coach-note"
        >
          {coachNote}
        </p>
      )}
    </div>
  );
}
