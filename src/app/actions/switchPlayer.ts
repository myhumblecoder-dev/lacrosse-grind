'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma as db } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

export async function switchPlayer(playerId: string): Promise<void> {
  const userId = await requireUserId()

  const player = await db.player.findFirst({
    where: {
      id: playerId,
      userId,
    },
  })

  if (!player) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set('x-active-player-id', playerId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 31536000,
  })

  revalidatePath('/')
}