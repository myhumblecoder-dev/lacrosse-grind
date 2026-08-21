'use server'

import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

export async function resetSeason(): Promise<void> {
  const userId = await requireUserId()
  await prisma.prize.updateMany({
    where: { userId },
    data: { seasonStart: null },
  })
}