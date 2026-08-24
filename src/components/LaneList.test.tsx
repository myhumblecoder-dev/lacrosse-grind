import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LaneList from './LaneList'
import { LANES_REQUIRED } from '@/lib/season'

const LANES = [
  { id: '1', name: 'Running', emoji: '🏃', isActive: true, targetPerWeek: 3 },
  { id: '2', name: 'Swimming', emoji: '🏊', isActive: false, targetPerWeek: 2 },
  { id: '3', name: 'Weights', emoji: '🏋️', isActive: true, targetPerWeek: 5 },
]

const SWAP_OK = { mustPickReplacement: false, canRetire: true, blocked: false }
const INACTIVE = [{ id: '2', name: 'Swimming', emoji: '🏊' }]

const WEEK_START = new Date('2026-08-17T00:00:00.000Z')

const actions = () => ({
  updateLane: vi.fn(),
  setActive: vi.fn(),
  deleteLane: vi.fn(),
  onSwapLane: vi.fn(),
  swapState: SWAP_OK,
  inactiveLanes: INACTIVE,
  weekStart: WEEK_START,
})

describe('LaneList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('a threaded requirement shows in the header', async () => {
    render(<LaneList lanes={LANES} {...actions()} requiredLanes={5} />)
    const header = screen.getByTestId('lane-count')
    expect(header).toHaveTextContent('2 of 5 lanes active')
  })

  it('no prop keeps today\'s header', async () => {
    render(<LaneList lanes={LANES} {...actions()} />)
    const header = screen.getByTestId('lane-count')
    expect(header).toHaveTextContent(`2 of ${LANES_REQUIRED} lanes active`)
  })

  it('the header counts only active lanes', async () => {
    const activeCount = LANES.filter(l => l.isActive).length
    render(<LaneList lanes={LANES} {...actions()} />)
    const header = screen.getByTestId('lane-count')
    expect(header).toHaveTextContent(`${activeCount} of ${LANES_REQUIRED} lanes active`)
  })

  it('the header names how many lanes the season needs', async () => {
    render(<LaneList lanes={LANES} {...actions()} />)
    const header = screen.getByTestId('lane-count')
    expect(header).toHaveTextContent(new RegExp(`of ${LANES_REQUIRED} lanes active`))
  })

  it('renders lanes with a toggle reflecting active state', () => {
    render(<LaneList lanes={LANES} {...actions()} />)
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Swimming')).toBeInTheDocument()
    const switches = screen.getAllByRole('switch')
    expect(switches[0]).toHaveAttribute('aria-checked', 'true')
    expect(switches[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('toggling the switch calls setActive with the flipped value', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('switch', { name: /toggle running/i }))
    expect(a.setActive).toHaveBeenCalledWith('1', false)
  })

  it('delete opens the confirm modal, and confirming calls deleteLane', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /delete running/i }))
    // custom modal, not window.confirm
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(a.deleteLane).toHaveBeenCalledWith('1')
  })

  it('cancelling the modal does not delete', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /delete running/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(a.deleteLane).not.toHaveBeenCalled()
  })

  it('edit then save calls updateLane with the draft', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /edit running/i }))
    const nameInput = screen.getByTestId('edit-name-1')
    await user.clear(nameInput)
    await user.type(nameInput, 'Sprints')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(a.updateLane).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Sprints' }))
  })

  it('offers a swap on each lane when the season allows a change', () => {
    render(<LaneList lanes={LANES} {...actions()} />)

    expect(screen.getByTestId('swap-btn-1')).toBeInTheDocument()
  })

  it('offers no swap when a change would break the three-lane floor', () => {
    const a = actions()
    render(
      <LaneList
        lanes={LANES}
        {...a}
        swapState={{ mustPickReplacement: false, canRetire: false, blocked: true }}
      />
    )

    expect(screen.queryByTestId('swap-btn-1')).not.toBeInTheDocument()
  })

  it('confirming the modal swaps the lane and closes it', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={LANES} {...a} />)

    await user.click(screen.getByTestId('swap-btn-1'))
    await user.click(screen.getByTestId('confirm-swap'))

    expect(a.onSwapLane).toHaveBeenCalledWith('1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('LaneList — a lane that has not started yet', () => {
  const NEXT_MONDAY = new Date('2026-08-24T00:00:00.000Z')

  it('says when a queued lane starts instead of scoring it', async () => {
    const lanes = [
      { ...LANES[0], startsOn: NEXT_MONDAY },
      LANES[1],
      LANES[2],
    ]
    render(<LaneList lanes={lanes} {...actions()} />)

    expect(screen.getByTestId('lane-starts-1')).toHaveTextContent(
      'starts Mon 24 Aug 2026'
    )
  })

  it('says nothing for a lane already running', async () => {
    render(<LaneList lanes={LANES} {...actions()} />)

    expect(screen.queryByTestId('lane-starts-1')).not.toBeInTheDocument()
  })

  it('shows a scheduled target change with the date it lands', async () => {
    const lanes = [
      {
        ...LANES[0],
        targetChanges: [{ target: 5, effectiveFrom: NEXT_MONDAY }],
      },
      LANES[1],
      LANES[2],
    ]
    render(<LaneList lanes={lanes} {...actions()} />)

    expect(screen.getByTestId('lane-target-scheduled-1')).toHaveTextContent(
      '→ 5×/week from Mon 24 Aug 2026'
    )
  })
})

describe('LaneList — deleting during a running season', () => {
  it('explains the refusal and offers Swap instead of a dead button', async () => {
    const user = userEvent.setup()
    const props = actions()
    render(<LaneList lanes={LANES} {...props} seasonRunning />)

    await user.click(screen.getByLabelText('Delete Running'))

    expect(screen.getByTestId('confirm-blocked')).toHaveTextContent(
      /Can't delete during a running season/
    )
    expect(screen.getByTestId('confirm-alt')).toHaveTextContent('Use Swap')
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('never calls the delete action while a season is running', async () => {
    const user = userEvent.setup()
    const props = actions()
    render(<LaneList lanes={LANES} {...props} seasonRunning />)

    await user.click(screen.getByLabelText('Delete Running'))
    await user.click(screen.getByTestId('confirm-alt'))

    expect(props.deleteLane).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument() // the swap modal
  })

  it('still deletes when no season is running', async () => {
    const user = userEvent.setup()
    const props = actions()
    props.deleteLane.mockResolvedValue({ ok: true })
    render(<LaneList lanes={LANES} {...props} />)

    await user.click(screen.getByLabelText('Delete Running'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(props.deleteLane).toHaveBeenCalledWith('1')
  })

  it('surfaces a refusal that only the server knew about', async () => {
    const user = userEvent.setup()
    const props = actions()
    props.deleteLane.mockResolvedValue({ ok: false, error: 'season-running' })
    render(<LaneList lanes={LANES} {...props} />)

    await user.click(screen.getByLabelText('Delete Running'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByTestId('confirm-blocked')).toHaveTextContent(
      /Can't delete during a running season/
    )
  })
})
