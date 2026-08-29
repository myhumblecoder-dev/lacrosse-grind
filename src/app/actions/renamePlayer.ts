'use server';

import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/tenancy';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(40);

export async function renamePlayer(
  playerId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: 'validation' | 'not-found' | 'duplicate' }> {
  const userId = await requireUserId();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: 'validation' };
  }
  const player = await prisma.player.findFirst({ where: { id: playerId, userId } });
  if (!player) {
    return { ok: false, error: 'not-found' };
  }
  try {
    await prisma.player.update({ where: { id: playerId }, data: { name: parsed.data } });
  } catch (err) {
    // @@unique([userId, name]) — a sibling already has this name.
    if ((err as { code?: string }).code === 'P2002') {
      return { ok: false, error: 'duplicate' };
    }
    throw err;
  }
  revalidatePath('/');
  return { ok: true };
}
