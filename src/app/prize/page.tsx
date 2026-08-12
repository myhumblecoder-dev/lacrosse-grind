import { prisma } from "@/lib/db"
import { upsertPrize } from "@/app/actions/upsertPrize"
import { deletePrize } from "@/app/actions/deletePrize"
import { uploadPrizePhoto } from "@/app/actions/uploadPrizePhoto"
import PrizeSection from "@/components/PrizeSection"
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

export default async function PrizePage() {
  const prize = await prisma.prize.findUnique({ where: { id: "prize" } })

  // Before Eddie presses START there is no window to filter on — the season
  // hasn't begun, so every check-in is fair game and the grid renders as
  // thirteen upcoming weeks.
  const seasonStart = prize?.seasonStart ?? null
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
    where: { isActive: true },
    select: {
      targetPerWeek: true,
      checkIns: {
        where: checkInWhere,
        select: {
          date: true,
          isRest: true,
        },
      },
    },
  })

  const progress = getSeasonProgress(lanes, getTrainingDay(new Date()), seasonStart)

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
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
        savePrize={async (data) => {
          "use server"
          return upsertPrize(data)
        }}
        deletePrize={async () => {
          "use server"
          return deletePrize()
        }}
        uploadPhoto={async (formData: FormData) => {
          "use server"
          return uploadPrizePhoto(formData)
        }}
      />

      <SeasonProgress progress={progress} />
    </main>
  )
}
