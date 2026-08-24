import Link from "next/link"
import Image from "next/image"

export const metadata = {
  title: "About — Lacrosse Grind",
  description:
    "A training companion for kids where showing up is the whole game. No grades, no leaderboards — lanes, boss battles, and a prize the family picks together.",
}

/** The nine evolutions, drawn from the same art the avatar uses. */
const EVOLUTIONS = [
  { level: 0, name: "baby" },
  { level: 1, name: "toddler" },
  { level: 2, name: "tween" },
  { level: 3, name: "page" },
  { level: 4, name: "squire" },
  { level: 5, name: "knight" },
  { level: 6, name: "barbarian" },
  { level: 7, name: "warlord" },
  { level: 8, name: "legend" },
]

const PILLARS = [
  {
    emoji: "🥍",
    title: "Lanes, not drills",
    body: `The player picks three training lanes — "30 min jogs", "wall ball", "3 sets of 5 pushups" — each with a weekly target. A daily tap says I showed up. Rest days count too.`,
  },
  {
    emoji: "⚔️",
    title: "Boss battles",
    body: "Hit the week's target and a boss wakes: the coach conjures a real-world challenge from the lane — pushups spawn burpees. Beat it in the backyard, tap I beat it, victory. No essay required.",
  },
  {
    emoji: "👹",
    title: "A monster that grows",
    body: "Every defeated boss feeds the player's monster — from a diapered baby to a winged legend across nine evolutions. Quit for a month? It waits. It never shrinks.",
  },
  {
    emoji: "🏆",
    title: "A season, a prize",
    body: "The family picks the prize — a jersey, a trip, a new stick — and a 13-week season begins. Show up 11 of 13 weeks and it's earned. Missing a week twice isn't failure; it's the margin built in.",
  },
]

const REASONS = [
  ["No feeds, no friends lists, no ads.", "There is nothing to scroll. The app takes thirty seconds a day and hands the rest back."],
  ["The kid never chats with an AI.", "The coach writes short, effort-framed notes from the training record only — it generates challenges and celebrates victories, and it cannot be talked to. Usage is capped daily."],
  ["Forgiveness is a mechanic.", "Rest days count as showing up, streak freezes absorb a missed day, and an unfought boss stays fightable a whole extra week. The design assumes real life."],
  ["The prize is yours, not ours.", "No coins, no gems, no in-app purchases. The reward is something real the family chose together."],
  ["The history is honest.", "Retired lanes stay on the record, every showed-up day stays green, and boss-battle weeks glow purple forever."],
]

/**
 * The pitch, moved here from the GitHub Pages site so it survives that site
 * being retired. The writing is the marketing page's; only its home changed.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-12 p-6">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">
          Lacrosse <span className="text-green-400">Grind</span>
        </h1>
        <p className="text-zinc-400">
          A training companion for kids where showing up is the whole game.
        </p>
        <div className="flex flex-wrap items-end justify-center gap-1">
          {EVOLUTIONS.map((e) => (
            <Image
              key={e.level}
              src={`/avatars/level-${e.level}.png`}
              alt={`Evolution ${e.level + 1} of 9: ${e.name}`}
              title={e.name}
              width={64}
              height={64}
              className="rounded-lg border border-zinc-800 [image-rendering:pixelated]"
              style={{ width: `${52 + e.level * 6}px`, height: "auto" }}
            />
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Nine evolutions. Every one earned by showing up.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          The <span className="text-purple-400">problem</span>
        </h2>
        <p className="text-sm leading-relaxed text-zinc-300">
          Most youth-sports apps grade kids. Times, percentages, leaderboards,
          streaks that shatter the first time life happens. A ten-year-old
          doesn&apos;t quit training because practice is hard — they quit because
          an app told them Tuesday&apos;s effort wasn&apos;t good enough, or
          because missing one day erased two weeks of pride.
        </p>
        <p className="text-sm leading-relaxed text-zinc-300">
          And the &ldquo;wellness&rdquo; alternatives swing the other way:
          journaling prompts, mood check-ins, reflection essays. Kids
          don&apos;t want therapy homework. They want to <em>play</em>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          The <span className="text-purple-400">solution</span>
        </h2>
        <p className="text-sm leading-relaxed text-zinc-300">
          Lacrosse Grind is built on one rule: <strong>effort over outcome.</strong>{" "}
          The app never grades performance — it only ever counts showing up.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <span className="mb-2 block text-2xl" aria-hidden="true">
                {p.emoji}
              </span>
              <h3 className="mb-2 font-semibold text-zinc-100">{p.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Why <span className="text-purple-400">families</span> love it
        </h2>
        <ul className="space-y-3">
          {REASONS.map(([lead, rest]) => (
            <li key={lead} className="relative pl-6 text-sm leading-relaxed text-zinc-400">
              <span className="absolute left-0 text-green-400" aria-hidden="true">
                ✓
              </span>
              <strong className="text-zinc-200">{lead}</strong> {rest}
            </li>
          ))}
        </ul>
        <p className="border-l-2 border-green-500 pl-4 text-sm italic text-zinc-400">
          Built by a dad and a bot army for one kid&apos;s lacrosse season —
          opened up for any family that wants a season of their own.
        </p>
      </section>

      <div className="space-y-3 border-t border-zinc-800 pt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-lg bg-green-500 px-8 py-3 font-bold text-zinc-950 hover:bg-green-400"
        >
          Try it without signing up →
        </Link>
        <p className="text-xs text-zinc-500">
          Look around first · sign in with Google when you want your own · free ·
          works on any phone
        </p>
      </div>
    </main>
  )
}
