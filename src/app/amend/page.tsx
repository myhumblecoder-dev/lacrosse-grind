import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { requirePlayerId } from "@/lib/tenancy"
import { getTrainingDay } from "@/lib/trainingDay"
import { getWeekStart } from "@/lib/weekUtils"
import { isLanePending } from "@/lib/lanePending"
import { buildAmendWeek } from "@/lib/amendWeek"
import { attestCheckIn } from "@/app/actions/attestCheckIn"
import { withdrawCheckIn } from "@/app/actions/withdrawCheckIn"
import AmendWeekGrid from "@/components/AmendWeekGrid"

export const dynamic = "force-dynamic"

/**
 * Put this week's record straight, as the person who was there.
 *
 * Not `getViewer`: a demo visitor has nothing to amend and no action they could
 * reach, so this gates on a real session the way `/account` does. The passphrase
 * gate is here too rather than in the grid — with none set, a parent lands where
 * they can set one instead of on a surface they cannot use.
 *
 * Only this week is fetched, because only this week is amendable.
 */
export default async function AmendPage() {
  const session = await auth()
  if (!session?.user) redirect("/signin")

  const userId = session.user.id as string
  const playerId = await requirePlayerId(userId)

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { witnessHash: true },
  })

  if (!account?.witnessHash) redirect("/account")

  const today = getTrainingDay(new Date())
  const weekStart = getWeekStart(today)

  const [prize, lanes] = await Promise.all([
    prisma.prize.findUnique({ where: { playerId } }),
    // Not `isActive: true`. A lane retired on Wednesday still has Monday and
    // Tuesday on the record — they render on History and still count toward the
    // week — so a parent needs a cell to withdraw them from. Retired lanes with
    // nothing on them this week are filtered out below rather than in the query,
    // which would also have dropped the ones that do.
    prisma.lane.findMany({
      where: { playerId },
      orderBy: { sortOrder: "asc" },
      include: {
        checkIns: { where: { date: { gte: weekStart } } },
        removals: { where: { date: { gte: weekStart } } },
      },
    }),
  ])

  // A lane that has not reached its first week has nothing to amend; a retired
  // one only earns a row if it has something on it this week.
  const liveLanes = lanes.filter(
    (l) =>
      !isLanePending(l.startsOn, weekStart) &&
      (l.isActive || l.checkIns.length > 0 || l.removals.length > 0)
  )
  const seasonStart = prize?.seasonStart ?? null
  const rows = buildAmendWeek(liveLanes, today, seasonStart)

  // Nothing here is being scored yet, so there is nothing to put straight.
  //
  // Two ways to be in that state, and the first version of this only caught one.
  // `resolveSeasonStart` returns the Monday ON OR AFTER the press, so starting a
  // season on a Tuesday dates it to next Monday and the seasonStart floor then
  // rejects every day of that week. The other is no season at all: there the
  // floor is skipped entirely and the grid came up fully live, inviting
  // attestations that History's `date >= seasonStart` filter would hide the
  // moment a season began — days put on the record and then silently gone.
  const seasonPending =
    seasonStart === null || seasonStart.getTime() > today.getTime()

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Amend this week</h1>
      <p className="text-sm text-zinc-500">
        For the days you were there for. Mark one he did and forgot to tap, or
        take one off that did not happen. This reaches the current week only —
        Monday through today — and every change shows up on his record as yours,
        not his.
      </p>

      {seasonPending ? (
        <p data-testid="amend-season-pending" className="text-zinc-500">
          {seasonStart === null
            ? "No season is running yet, so nothing this week is being counted — there is nothing here to put straight. Start a season from Today first."
            : "The season starts on Monday, so this week is not being counted yet — there is nothing here to put straight. Come back once it is running."}
        </p>
      ) : rows.length === 0 ? (
        <p data-testid="amend-no-lanes" className="text-zinc-500">
          No lanes are running this week yet, so there is nothing to amend. A
          lane added mid-week starts counting on Monday.
        </p>
      ) : (
        <AmendWeekGrid
          lanes={rows}
          attestCheckIn={async (input) => {
            "use server"
            return attestCheckIn(input)
          }}
          withdrawCheckIn={async (input) => {
            "use server"
            return withdrawCheckIn(input)
          }}
        />
      )}

      <Link
        href="/history"
        data-testid="amend-back"
        className="inline-block text-sm text-zinc-400 hover:text-zinc-200"
      >
        ← Back to history
      </Link>
    </main>
  )
}
