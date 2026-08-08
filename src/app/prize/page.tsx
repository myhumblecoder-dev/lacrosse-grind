import { prisma } from "@/lib/db"
import { upsertPrize } from "@/app/actions/upsertPrize"
import { deletePrize } from "@/app/actions/deletePrize"
import { uploadPrizePhoto } from "@/app/actions/uploadPrizePhoto"
import PrizeSection from "@/components/PrizeSection"
import SeasonProgress from "@/components/SeasonProgress"
import { SEASON_START, getSeasonEnd } from "@/lib/season"
import { getSeasonProgress } from "@/lib/seasonProgress"
import { getTrainingDay } from "@/lib/trainingDay"

export const dynamic = "force-dynamic"

export default async function PrizePage() {
  const prize = await prisma.prize.findUnique({ where: { id: "prize" } })

  const lanes = await prisma.lane.findMany({
    where: { isActive: true },
    select: {
      targetPerWeek: true,
      checkIns: {
        where: {
          date: {
            gte: SEASON_START,
            lt: getSeasonEnd(),
          },
        },
        select: {
          date: true,
          isRest: true,
        },
      },
    },
  })

  const progress = getSeasonProgress(lanes, getTrainingDay(new Date()))

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
