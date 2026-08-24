import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import LanePendingCard from "@/components/LanePendingCard"

const lane = { name: "10lbs weight squats 3 sets of 8", emoji: "🏋" }

describe("LanePendingCard", () => {
  it("names the lane and the Monday it starts", () => {
    render(
      <LanePendingCard lane={lane} startsOn={new Date("2026-08-24T00:00:00.000Z")} />
    )

    expect(screen.getByText(lane.name)).toBeInTheDocument()
    expect(screen.getByText(/Starts Mon 24 Aug 2026/)).toBeInTheDocument()
  })

  it("offers no check-in and states no score for a week it was not in", () => {
    render(
      <LanePendingCard lane={lane} startsOn={new Date("2026-08-24T00:00:00.000Z")} />
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByText(/days this week/)).not.toBeInTheDocument()
  })
})
