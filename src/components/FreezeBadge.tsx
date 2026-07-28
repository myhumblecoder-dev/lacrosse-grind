interface FreezeBadgeProps {
  availableFreezes: number;
}

export function FreezeBadge({ availableFreezes }: FreezeBadgeProps) {
  if (availableFreezes === 0) {
    return <span className="text-gray-400">No freezes</span>;
  }

  return <span>❄️ {availableFreezes}</span>;
}