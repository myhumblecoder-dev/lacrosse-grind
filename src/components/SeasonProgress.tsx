import type { SeasonProgress as SeasonProgressData } from "@/lib/seasonProgress";
import { formatWeekLabel } from "@/lib/weekUtils";
import { WEEKS_REQUIRED } from "@/lib/season";

export default function SeasonProgress({ progress }: { progress: SeasonProgressData }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Season Progress</h2>

      <div className="flex flex-wrap gap-2">
        {progress.weeks.map((week, index) => (
          <div
            key={index}
            data-testid="season-week"
            data-status={week.status}
            title={formatWeekLabel(week.weekStart)}
            className={`h-8 w-8 rounded-md flex items-center justify-center text-xs font-medium border border-white/10 ${
              week.status === "qualified"
                ? "bg-emerald-500/20 text-emerald-400"
                : week.status === "missed"
                ? "bg-rose-500/20 text-rose-400"
                : week.status === "current"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-zinc-500/20 text-zinc-400"
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div data-testid="season-summary" className="text-sm text-zinc-400">
          {progress.qualified} of {WEEKS_REQUIRED} qualifying weeks
        </div>

        {progress.earned ? (
          <div data-testid="season-earned" className="text-sm font-medium text-emerald-400">
            Prize earned
          </div>
        ) : (
          <div data-testid="season-misses" className="text-sm text-rose-400">
            {progress.missesRemaining} misses left
          </div>
        )}
      </div>
    </div>
  );
}
