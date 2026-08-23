import PlayerAvatar from "@/components/PlayerAvatar";
import { playerLevel } from "@/lib/playerLevel";

interface PlayerAvatarCardProps {
  defeats: number;
}

export default function PlayerAvatarCard({ defeats }: PlayerAvatarCardProps) {
  const { level, name, nextAt, progress } = playerLevel(defeats);

  const nextText = nextAt !== null 
    ? `${defeats} defeats · ${nextAt - defeats} to next` 
    : `${defeats} defeats · max level`;

  return (
    <div className="flex flex-row items-center gap-4 rounded-lg border p-4">
      <PlayerAvatar level={level} name={name} />
      <div className="flex flex-col gap-1">
        <div 
          data-testid="avatar-level-name" 
          className="text-sm font-medium"
        >
          {name.charAt(0).toUpperCase() + name.slice(1)} · Level {level}
        </div>
        <div className="text-xs text-zinc-500">
          {nextText}
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-700">
          <div
            data-testid="avatar-progress-bar"
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}