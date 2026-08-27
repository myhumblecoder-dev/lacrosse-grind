'use client'

interface Player {
  id: string;
  name: string;
}

interface PlayerSwitcherProps {
  players: Player[];
  activePlayerId: string;
  switchPlayer: (playerId: string) => Promise<void>;
}

export default function PlayerSwitcher({
  players,
  activePlayerId,
  switchPlayer,
}: PlayerSwitcherProps) {
  if (players.length <= 1) {
    return null;
  }

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await switchPlayer(e.target.value);
  };

  return (
    <select
      data-testid="player-switcher"
      value={activePlayerId}
      onChange={handleSelectChange}
      className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.name}
        </option>
      ))}
    </select>
  );
}
