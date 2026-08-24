import { promptSignIn } from "@/app/actions/promptSignIn"

/**
 * Says out loud that this season belongs to nobody.
 *
 * A populated dashboard reads as *your* data. Without this the demo is not a
 * demo, it is a stranger's training record that a visitor may reasonably think
 * is theirs — and then wonder why nothing they tap sticks.
 */
export default function DemoBanner() {
  return (
    <div
      data-testid="demo-banner"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
    >
      <p className="text-amber-100">
        <span aria-hidden="true">👋</span> This is a sample season, not yours —
        have a look around, then start your own.
      </p>
      <form action={promptSignIn}>
        <button
          type="submit"
          data-testid="demo-banner-signin"
          className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
        >
          Start my season
        </button>
      </form>
    </div>
  )
}
