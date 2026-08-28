'use server';

import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/tenancy';
import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(40);

export async function createPlayer(
  name: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: 'validation' };
  }
  // Hard per-account cap of 6 players (Thomas, 2026-08-27).
  const count = await prisma.player.count({ where: { userId } });
  if (count >= 6) {
    return { ok: false, error: 'cap' };
  }
  try {
    const row = await prisma.player.create({
      data: { userId, name: parsed.data, isDefault: false },
    });
    return { ok: true, id: row.id };
  } catch (err) {
    // @@unique([userId, name]) — a sibling already has this name.
    if ((err as { code?: string }).code === 'P2002') {
      return { ok: false, error: 'duplicate' };
    }
    throw err;
  }
}
