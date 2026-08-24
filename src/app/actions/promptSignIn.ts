'use server'

import { signIn } from '@/auth'

/**
 * What every control does for a visitor who has not signed in.
 *
 * The demo hands this to the pages in place of the real actions, so reaching
 * for "I showed up" is the moment you are invited in rather than the moment
 * something silently fails. It also means no action is entered at all on the
 * signed-out path — the write gate never even has to say no.
 */
export async function promptSignIn(): Promise<void> {
  await signIn('google', { redirectTo: '/' })
}
