import { prisma } from "@/lib/db"
import { getViewer, type Viewer } from "@/lib/viewer"
import { getDemoSeason } from "@/lib/demoSeason"
import { promptSignIn } from "@/app/actions/promptSignIn"
import DemoBanner from "@/components/DemoBanner"
import { upsertPrize } from "@/app/actions/upsertPrize"
import { deletePrize } from "@/app/actions/deletePrize"
import { uploadPrizePhoto } from "@/app/actions/uploadPrizePhoto"
import PrizeSection from "@/components/PrizeSection"
import SeasonTimelineNote from "@/components/SeasonTimelineNote"
import SeasonProgress from "@/components/SeasonProgress"
import { SEASON_WEEKS } from "@/lib/season"
import { getSeasonWeeksFrom } from "@/lib/seasonWindow"
import { getSeasonProgress } from "@/lib/seasonProgress"
import { getTrainingDay } from "@/lib/trainingDay"

export const dynamic = "force-dynamic"

/** Exclusive end of a season that began on `start`: one week past week 13. */
function seasonEnd(start: Date): Date {
  const lastWeekStart = getSeasonWeeksFrom(start)[SEASON_WEEKS - 1]
  const end = new Date(lastWeekStart)
  end.setUTCDate(end.getUTCDate() + 7)
  return end
}

/**
 * The prize and every lane the season has seen, from the database or the demo.
 *
 * Every lane, not just the active ones: the grid answers "what happened this
 * season", and a lane that was retired still earned the check-ins it earned.
 * Filtering on isActive here would erase them from weeks already qualified, so
 * swapping a lane would silently undo the season. TODAY is the page that cares
 * about what is active now.
 */
async function loadPrize(viewer: Viewer, today: Date) {
  if (viewer.kind === "demo") {
    const demo = getDemoSeason(today)
    return { prize: demo.prize, lanes: demo.lanes }
  }

  const { playerId } = viewer
  const prize = await prisma.prize.findUnique({ where: { playerId } })
  const seasonStart = prize?.seasonStart ?? null

  // Before START there is no window to filter on — the season hasn't begun,
  // so every check-in is fair game and the grid renders as thirteen upcoming
  // weeks.
  const checkInWhere = seasonStart
    ? {
        date: {
          gte: seasonStart,
          // The exclusive end is a week AFTER the last week starts, or the
          // thirteenth week's check-ins fall outside the window.
          lt: seasonEnd(seasonStart),
        },
      }
    : {}

  const lanes = await prisma.lane.findMany({
    where: { playerId },
    select: {
      targetPerWeek: true,
      // Each week is scored against the target that was in force THAT week, so
      // raising a target now cannot un-qualify a week already earned.
      targetChanges: { select: { target: true, effectiveFrom: true } },
      checkIns: { where: checkInWhere, select: { date: true, isRest: true } },
    },
  })

  return { prize, lanes }
}

export default async function PrizePage() {
  const viewer = await getViewer()
  const isDemo = viewer.kind === "demo"
  const today = getTrainingDay(new Date())

  const { prize, lanes } = await loadPrize(viewer, today)

  const seasonStart = prize?.seasonStart ?? null

  const progress = getSeasonProgress(lanes, today, seasonStart)

  // Signed-out visitors get the sign-in prompt instead of a write.
  const gate = async () => {
    "use server"
    await promptSignIn()
  }

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      {isDemo && <DemoBanner />}
      <h1 className="text-2xl font-bold">The Prize</h1>
      <p className="mt-1 text-sm text-zinc-500">
        The one thing you&apos;re playing for. Keep it in sight.
      </p>

      <PrizeSection
        prize={
          prize
            ? {
                title: prize.title,
                description: prize.description,
                reasons: prize.reasons,
                photoUrl: prize.photoUrl,
              }
            : null
        }
        savePrize={isDemo ? gate : async (data) => {
          "use server"
          return upsertPrize(data)
        }}
        deletePrize={isDemo ? gate : async () => {
          "use server"
          return deletePrize()
        }}
        uploadPhoto={isDemo ? gate : async (formData: FormData) => {
          "use server"
          return uploadPrizePhoto(formData)
        }}
      />

      <SeasonTimelineNote seasonStart={seasonStart} today={today} />
      <SeasonProgress progress={progress} />
    </main>
  )
}
