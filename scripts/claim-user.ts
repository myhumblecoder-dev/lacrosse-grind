/**
 * Bind all pre-auth rows to their owner. Run ONCE at cutover, before the
 * auth build deploys:
 *
 *   pnpm exec tsx scripts/claim-user.ts eddie@example.com "Eddie"
 *
 * Idempotent: rows that already carry a userId are never touched, and the
 * User upsert is keyed on email.
 */
import { prisma } from "../src/lib/db"

async function main() {
  const [email, name] = process.argv.slice(2)
  if (!email) {
    console.error("usage: tsx scripts/claim-user.ts <email> [name]")
    process.exit(1)
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: name ?? null },
  })
  console.log(`user ${user.id} (${email})`)

  for (const model of ["lane", "weeklyReflection", "prize"] as const) {
    // @ts-expect-error -- indexing the client by model name
    const { count } = await prisma[model].updateMany({
      where: { userId: null },
      data: { userId: user.id },
    })
    console.log(`${model}: claimed ${count} row(s)`)
  }
}

main().finally(() => prisma.$disconnect())
