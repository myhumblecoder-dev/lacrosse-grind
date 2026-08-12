'use server'

import { prisma } from '@/lib/db'

export async function resetSeason(): Promise<void> {
  await prisma.prize.update({
    where: { id: 'prize' },
    data: { seasonStart: null },
  })
}