import PlayerAvatar from "@/components/PlayerAvatar";
import { playerLevel } from "@/lib/playerLevel";

interface PlayerAvatarCardProps {
  defeats: number;
}

// How many evolutions the ladder holds, asked of the ladder itself so a tenth
// rank renders here without an edit. The test still pins nine deliberately: a
// new rank needs new art, so it should fail until someone has decided about
// that rather than quietly drawing an unlit pip with no monster behind it.
const EVOLUTIONS = playerLevel(Number.MAX_SAFE_INTEGER).level + 1;

/**
 * The monster, its rank, and one pip per evolution.
 *
 * Pips rather than a progress bar: the first three ranks are a single boss
 * wide, so a bar measuring distance-to-next-rank was pinned at zero for every
 * new player — empty at exactly the moment someone is deciding whether this
 * app is worth anything. A pip row always shows where you are, and draws the
 * nine-evolution journey the game is actually about.
 */
export default function PlayerAvatarCard({ defeats }: PlayerAvatarCardProps) {
  const { level, name } = playerLevel(defeats);
  const earned = level + 1;

  return (
    <div className="flex flex-row items-center gap-4 rounded-lg border p-4">
      <PlayerAvatar level={level} name={name} />
      <div className="flex flex-col gap-1">
        <div data-testid="avatar-level-name" className="text-sm font-medium">
          {name.charAt(0).toUpperCase() + name.slice(1)} · Level {level}
        </div>
        <div
          data-testid="avatar-pips"
          className="flex items-center gap-1.5"
          role="img"
          aria-label={`Evolution ${earned} of ${EVOLUTIONS}: ${name}`}
        >
          {Array.from({ length: EVOLUTIONS }, (_, i) => (
            <span
              key={i}
              data-testid={i < earned ? "pip-earned" : "pip-locked"}
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                i < earned ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
