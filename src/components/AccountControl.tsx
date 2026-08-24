import { promptSignIn } from "@/app/actions/promptSignIn"
import { signOutAction } from "@/app/actions/signOutAction"
import { SignInIcon, SignOutIcon } from "@/components/icons"

interface AccountControlProps {
  signedIn: boolean
}

/**
 * The one place that answers "am I in, and how do I change that".
 *
 * A form rather than a click handler, so it works without JavaScript, and a
 * server component so the answer comes from the session rather than from
 * anything the browser could be wrong about.
 */
export default function AccountControl({ signedIn }: AccountControlProps) {
  const action = signedIn ? signOutAction : promptSignIn
  const label = signedIn ? "Sign out" : "Sign in"
  const Icon = signedIn ? SignOutIcon : SignInIcon

  return (
    <form action={action}>
      <button
        type="submit"
        title={label}
        aria-label={label}
        data-testid={signedIn ? "header-sign-out" : "header-sign-in"}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        <Icon />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </form>
  )
}
