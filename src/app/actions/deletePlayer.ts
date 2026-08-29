'use server';

import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/tenancy';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const ACTIVE_PLAYER_COOKIE = 'x-active-player-id';

export async function deletePlayer(
  playerId: string,
  confirmation: string
): Promise<{ ok: true } | { ok: false; error: 'last-player' | 'confirmation-mismatch' | 'not-found' }> {
  const userId = await requireUserId();
  const players = await prisma.player.findMany({ where: { userId } });
  const target = players.find((p) => p.id === playerId);
  if (!target) {
    return { ok: false, error: 'not-found' };
  }
  if (players.length <= 1) {
    return { ok: false, error: 'last-player' };
  }
  // Typed confirmation must match the player's name exactly — the delete
  // cascades the player's lanes and prize (schema onDelete: Cascade).
  if (confirmation !== target.name) {
    return { ok: false, error: 'confirmation-mismatch' };
  }
  await prisma.player.delete({ where: { id: playerId } });
  const store = await cookies();
  if (store.get(ACTIVE_PLAYER_COOKIE)?.value === playerId) {
    store.delete(ACTIVE_PLAYER_COOKIE);
  }
  revalidatePath('/');
  return { ok: true };
}
