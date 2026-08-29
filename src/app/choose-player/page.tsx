import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/tenancy';
import PlayerChooserClient from './PlayerChooserClient';

// Reads cookies (via requireUserId's session) and the DB on every request.
export const dynamic = 'force-dynamic';

export default async function ChoosePlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const userId = await requireUserId();
  const players = await prisma.player.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  // Level = defeated bosses across each player's lanes. Fan-out is fine — the
  // account cap is 6 players.
  const playersWithDefeats = await Promise.all(
    players.map(async (player) => ({
      ...player,
      defeats: await prisma.bossBattle.count({
        where: { completedAt: { not: null }, lane: { playerId: player.id } },
      }),
    }))
  );
  const { mode } = await searchParams;
  return (
    <PlayerChooserClient players={playersWithDefeats} manage={mode === 'manage'} />
  );
}
