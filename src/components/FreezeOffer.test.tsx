import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import FreezeOffer from "@/components/FreezeOffer"

const props = () => ({
  laneId: "lane-1",
  missedDate: "2026-01-04T00:00:00.000Z",
  streakIfRepaired: 9,
  freezesAvailable: 1,
  spendFreeze: vi.fn().mockResolvedValue({ ok: true }),
})

describe("FreezeOffer", () => {
  beforeEach(() => vi.clearAllMocks())

  it("names the missed day and what the streak becomes", () => {
    render(<FreezeOffer {...props()} />)

    expect(screen.getByTestId("freeze-offer")).toHaveTextContent(
      /You missed Sun 04 Jan 2026/
    )
    expect(screen.getByTestId("freeze-offer")).toHaveTextContent(
      /take your streak to 9/
    )
  })

  it("shows how many tokens are left on the button", () => {
    render(<FreezeOffer {...props()} freezesAvailable={2} />)

    expect(screen.getByTestId("use-freeze")).toHaveTextContent("Use a freeze · 2 left")
  })

  it("spends the freeze on the day it offered", async () => {
    const user = userEvent.setup()
    const p = props()
    render(<FreezeOffer {...p} />)

    await user.click(screen.getByTestId("use-freeze"))

    expect(p.spendFreeze).toHaveBeenCalledWith("lane-1", new Date(p.missedDate))
  })

  it("offers nothing when the bank is empty", () => {
    render(<FreezeOffer {...props()} freezesAvailable={0} />)

    expect(screen.queryByTestId("freeze-offer")).not.toBeInTheDocument()
  })

  it("says so when the server refuses rather than looking like it worked", async () => {
    const user = userEvent.setup()
    const p = props()
    p.spendFreeze.mockResolvedValue({ ok: false })
    render(<FreezeOffer {...p} />)

    await user.click(screen.getByTestId("use-freeze"))

    expect(await screen.findByTestId("freeze-offer-error")).toHaveTextContent(
      /can't be bridged/
    )
  })
})
