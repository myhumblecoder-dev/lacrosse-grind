import Link from 'next/link';

interface SeasonSetupPanelProps {
  laneCount: number;
  lanesNeeded: number;
  hasPrize: boolean;
}

export default function SeasonSetupPanel({ 
  laneCount, 
  lanesNeeded, 
  hasPrize 
}: SeasonSetupPanelProps) {
  const lanesStepDone = laneCount >= lanesNeeded;
  const prizeStepDone = hasPrize;

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Season Setup</h2>
      <ol className="space-y-4">
        <li 
          className="flex items-center justify-between group"
          data-testid={lanesStepDone ? "step-done" : undefined}
        >
          <Link 
            href="/lanes"
            className="text-sm text-slate-600 group-hover:text-emerald-600 transition-colors"
          >
            Add {lanesNeeded} lanes ({laneCount}/{lanesNeeded})
          </Link>
          {lanesStepDone && (
            <span className="text-emerald-500 text-xs font-medium">✓</span>
          )}
        </li>
        <li 
          className="flex items-center justify-between group"
          data-testid={prizeStepDone ? "step-done" : undefined}
        >
          <Link 
            href="/prize"
            className="text-sm text-slate-600 group-hover:text-emerald-600 transition-colors"
          >
            Set your prize
          </Link>
          {prizeStepDone && (
            <span className="text-emerald-500 text-xs font-medium">✓</span>
          )}
        </li>
      </ol>
    </div>
  );
}
