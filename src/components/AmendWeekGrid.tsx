"use client"

import { useState, useTransition } from "react"
import type { AmendDayState, AmendLaneWeek } from "@/lib/amendWeek"

interface AmendInput {
  laneId: string
  date: Date
  isRest: boolean
  note?: string | null
  passphrase: string
}

interface WithdrawInput {
  laneId: string
  date: Date
  note?: string | null
  passphrase: string
}

interface AmendWeekGridProps {
  lanes: AmendLaneWeek[]
  attestCheckIn: (input: AmendInput) => Promise<{ ok: boolean; error?: string }>
  withdrawCheckIn: (
    input: WithdrawInput
  ) => Promise<{ ok: boolean; error?: string }>
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** yyyy-MM-dd, from the UTC parts — the same key the rows are stored under. */
function dayId(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function weekdayLabel(date: Date): string {
  return DOW[(date.getUTCDay() + 6) % 7]
}

/** Cell colours follow History's language, so the same week reads the same way. */
const CELL_STYLE: Record<AmendDayState, string> = {
  session: "bg-green-500/80 text-zinc-950",
  rest: "bg-blue-400/80 text-zinc-950",
  withdrawn: "border-2 border-dashed border-zinc-600 text-zinc-500",
  empty: "bg-zinc-800 text-zinc-500",
}

const ERROR_COPY: Record<string, string> = {
  "bad-passphrase": "That passphrase didn't match.",
  "no-passphrase": "No passphrase is set yet — set one on the Account page.",
  "outside-window": "Amendments only reach the current week.",
  validation: "Type your amend passphrase first.",
  "write-failed": "That didn't save — try again in a moment.",
}

const STATE_LABEL: Record<AmendDayState, string> = {
  session: "trained",
  rest: "rest day",
  withdrawn: "taken off the record",
  empty: "nothing on the record",
}

/**
 * The amend grid: one row per lane, one cell per day from Monday to today.
 *
 * Cells are sized to be tapped on a phone rather than to match History's 24px
 * display squares — this is a control surface, not a record.
 *
 * The passphrase lives in component state for the visit and goes with every
 * write. No witness cookie: a write is then verified at the moment it happens
 * rather than against a state that was true several minutes ago. It is not
 * cleared on a failure, because a parent fixing a typo should not have to retype
 * the context too, and nothing is offered until it has been typed — an empty one
 * comes back from the schema as a bare validation error, which tells a parent
 * nothing about what is missing.
 *
 * A day already on the record gets different choices from an empty one. Offering
 * "He showed up" on an already-green Tuesday meant a parent opening it to look
 * could restamp the player's own check-in as a witness statement, which is
 * exactly the laundering the schema refuses in the other direction. A marked day
 * can be taken off, or have its nature changed by a button that says so.
 */
export default function AmendWeekGrid({
  lanes,
  attestCheckIn,
  withdrawCheckIn,
}: AmendWeekGridProps) {
  const [passphrase, setPassphrase] = useState("")
  const [openCell, setOpenCell] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const close = () => {
    setOpenCell(null)
    setNote("")
  }

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null)
      try {
        const result = await action()
        if (result.ok) {
          close()
        } else {
          setError(
            ERROR_COPY[result.error ?? ""] ??
              "That didn't go through — give it another go."
          )
        }
      } catch {
        // A rejected transition otherwise escalates to the nearest error
        // boundary and takes the page down with it.
        setError("Something went wrong — give it another go.")
      }
    })

  return (
    <div data-testid="amend-grid" className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="amend-passphrase" className="block text-sm text-zinc-400">
          Your amend passphrase
        </label>
        <input
          id="amend-passphrase"
          data-testid="amend-passphrase"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="current-password"
          className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 p-2"
        />
      </div>

      {lanes.map((lane) => (
        <div
          key={lane.id}
          data-testid={`amend-row-${lane.id}`}
          className="space-y-2 rounded-lg border border-zinc-800 p-3"
        >
          <div className="flex items-center gap-2 font-medium">
            <span>{lane.emoji}</span>
            <span>{lane.name}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {lane.days.map((day) => {
              const id = `${lane.id}-${dayId(day.date)}`
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`amend-cell-${id}`}
                  disabled={!day.amendable || isPending}
                  onClick={() => {
                    setError(null)
                    setNote("")
                    setOpenCell(openCell === id ? null : id)
                  }}
                  title={
                    day.attested
                      ? `${dayId(day.date)} — on the record by a witness`
                      : dayId(day.date)
                  }
                  aria-label={`${weekdayLabel(day.date)} ${dayId(day.date)} — ${
                    STATE_LABEL[day.state]
                  }${day.attested ? ", on the record by a witness" : ""}`}
                  className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    CELL_STYLE[day.state]
                  } ${day.attested ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-zinc-950" : ""}`}
                >
                  <span>{weekdayLabel(day.date)}</span>
                  <span aria-hidden="true">
                    {day.state === "session"
                      ? "✓"
                      : day.state === "rest"
                        ? "z"
                        : day.state === "withdrawn"
                          ? "–"
                          : ""}
                  </span>
                </button>
              )
            })}
          </div>

          {lane.days.map((day) => {
            const id = `${lane.id}-${dayId(day.date)}`
            if (openCell !== id) return null
            const marked = day.state === "session" || day.state === "rest"
            const blocked = isPending || passphrase.length === 0

            return (
              <div
                key={`panel-${id}`}
                data-testid="amend-day-panel"
                className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3"
              >
                <p className="text-sm text-zinc-300">
                  {weekdayLabel(day.date)} {dayId(day.date)} — what happened?
                </p>

                <input
                  data-testid="amend-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything worth remembering (optional)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm"
                />

                <div className="flex flex-wrap gap-2">
                  {!marked && (
                    <>
                      <button
                        type="button"
                        data-testid="amend-showed-up"
                        disabled={blocked}
                        onClick={() =>
                          run(() =>
                            attestCheckIn({
                              laneId: lane.id,
                              date: day.date,
                              isRest: false,
                              note: note || null,
                              passphrase,
                            })
                          )
                        }
                        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-40"
                      >
                        He showed up
                      </button>

                      <button
                        type="button"
                        data-testid="amend-rest-day"
                        disabled={blocked}
                        onClick={() =>
                          run(() =>
                            attestCheckIn({
                              laneId: lane.id,
                              date: day.date,
                              isRest: true,
                              note: note || null,
                              passphrase,
                            })
                          )
                        }
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                      >
                        Rest day
                      </button>
                    </>
                  )}

                  {marked && (
                    <>
                      <button
                        type="button"
                        data-testid="amend-withdraw"
                        disabled={blocked}
                        onClick={() =>
                          run(() =>
                            withdrawCheckIn({
                              laneId: lane.id,
                              date: day.date,
                              note: note || null,
                              passphrase,
                            })
                          )
                        }
                        className="rounded-lg border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                      >
                        This one didn&apos;t happen
                      </button>

                      {/* Changing a day's nature says what it is doing. The same
                          write behind an ambiguous label let a parent opening a
                          green cell restamp the player's own check-in. */}
                      <button
                        type="button"
                        data-testid="amend-flip"
                        disabled={blocked}
                        onClick={() =>
                          run(() =>
                            attestCheckIn({
                              laneId: lane.id,
                              date: day.date,
                              isRest: day.state !== "rest",
                              note: note || null,
                              passphrase,
                            })
                          )
                        }
                        className="rounded-lg border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                      >
                        {day.state === "rest"
                          ? "Actually a session"
                          : "Actually a rest day"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    data-testid="amend-cancel"
                    onClick={close}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Leave it
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {error && (
        <p data-testid="amend-error" className="text-sm text-amber-300">
          {error}
        </p>
      )}
    </div>
  )
}
