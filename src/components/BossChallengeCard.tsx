type BossChallengeCardProps = {
  challenge: string | null;
  rerolled: boolean;
  completedAt: Date | null;
  coachNote: string | null;
  onFace: () => Promise<void>;
  onReroll: () => Promise<void>;
  onComplete: () => Promise<void>;
};

export default function BossChallengeCard({
  challenge,
  rerolled,
  completedAt,
  coachNote,
  onFace,
  onReroll,
  onComplete,
}: BossChallengeCardProps) {
  // State 1: No challenge exists yet
  if (challenge === null) {
    return (
      <form
        action={onFace}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <button
          type="submit"
        className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          data-testid="face-boss"
        >
          Face the boss
        </button>
      </form>
    );
  }

  // State 2: Challenge is active (not completed)
  if (completedAt === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p
          className="mb-4 text-sm font-medium text-slate-600"
          data-testid="boss-challenge"
        >
          {challenge}
        </p>
        <div className="flex flex-col gap-2">
          <form action={onComplete}>
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              data-testid="beat-boss"
            >
              I beat it
            </button>
          </form>

          {!rerolled && (
            <form action={onReroll}>
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate랑-700 transition-colors hover:bg-slate-50"
                data-testid="reroll-boss"
              >
                Different challenge
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // State 3: Boss has been defeated
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <p
        className="text-sm font-bold text-emerald-700"
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
