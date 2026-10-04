import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AmendWeekGrid from './AmendWeekGrid'
import type { AmendDay, AmendLaneWeek } from '@/lib/amendWeek'

const MONDAY = new Date('2026-09-28T00:00:00.000Z')
const TUESDAY = new Date('2026-09-29T00:00:00.000Z')
const WEDNESDAY = new Date('2026-09-30T00:00:00.000Z')

function day(date: Date, overrides: Partial<AmendDay> = {}): AmendDay {
  return { date, state: 'empty', attested: false, amendable: true, ...overrides }
}

function lane(overrides: Partial<AmendLaneWeek> = {}): AmendLaneWeek {
  return {
    id: 'lane-1',
    name: 'Stick Skills',
    emoji: '🥍',
    days: [day(MONDAY), day(TUESDAY), day(WEDNESDAY)],
    ...overrides,
  }
}

const props = (lanes: AmendLaneWeek[] = [lane()]) => ({
  lanes,
  attestCheckIn: vi.fn().mockResolvedValue({ ok: true }),
  withdrawCheckIn: vi.fn().mockResolvedValue({ ok: true }),
})

describe('AmendWeekGrid', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders one cell per day in the lane row', () => {
    render(<AmendWeekGrid {...props()} />)

    expect(screen.getByTestId('amend-cell-lane-1-2026-09-28')).toBeInTheDocument()
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-29')).toBeInTheDocument()
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-30')).toBeInTheDocument()
  })

  it('labels each cell with its weekday', () => {
    render(<AmendWeekGrid {...props()} />)

    expect(screen.getByTestId('amend-cell-lane-1-2026-09-28')).toHaveTextContent('Mon')
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-30')).toHaveTextContent('Wed')
  })

  it('renders a row per lane', () => {
    render(<AmendWeekGrid {...props([lane(), lane({ id: 'lane-2', name: 'Shooting' })])} />)

    expect(screen.getByTestId('amend-row-lane-1')).toBeInTheDocument()
    expect(screen.getByTestId('amend-row-lane-2')).toBeInTheDocument()
  })

  it('a non-amendable cell is disabled', () => {
    const row = lane({ days: [day(MONDAY, { amendable: false }), day(TUESDAY)] })
    render(<AmendWeekGrid {...props([row])} />)

    expect(screen.getByTestId('amend-cell-lane-1-2026-09-28')).toBeDisabled()
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-29')).toBeEnabled()
  })

  it('tapping an amendable cell opens the day panel', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    expect(screen.queryByTestId('amend-day-panel')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.getByTestId('amend-day-panel')).toBeInTheDocument()
  })

  it('opens only one day panel at a time', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-30'))

    expect(screen.getAllByTestId('amend-day-panel')).toHaveLength(1)
  })

  it('tapping the open cell again closes the panel', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.queryByTestId('amend-day-panel')).not.toBeInTheDocument()
  })

  it('the withdraw control is absent for an empty day', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.queryByTestId('amend-withdraw')).not.toBeInTheDocument()
  })

  it('the withdraw control is offered for a day with a session', async () => {
    const user = userEvent.setup()
    const row = lane({ days: [day(TUESDAY, { state: 'session' })] })
    render(<AmendWeekGrid {...props([row])} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.getByTestId('amend-withdraw')).toBeInTheDocument()
  })

  it('a marked day is not offered "He showed up" — that would restamp the player\'s own tap', async () => {
    const user = userEvent.setup()
    const row = lane({ days: [day(TUESDAY, { state: 'session' })] })
    render(<AmendWeekGrid {...props([row])} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.queryByTestId('amend-showed-up')).not.toBeInTheDocument()
    expect(screen.queryByTestId('amend-rest-day')).not.toBeInTheDocument()
  })

  it('a session day offers an explicit flip to a rest day', async () => {
    const user = userEvent.setup()
    const row = lane({ days: [day(TUESDAY, { state: 'session' })] })
    const p = props([row])
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    expect(screen.getByTestId('amend-flip')).toHaveTextContent('Actually a rest day')

    await user.click(screen.getByTestId('amend-flip'))
    expect(p.attestCheckIn).toHaveBeenCalledWith(expect.objectContaining({ isRest: true }))
  })

  it('a rest day offers an explicit flip to a session', async () => {
    const user = userEvent.setup()
    const row = lane({ days: [day(TUESDAY, { state: 'rest' })] })
    const p = props([row])
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    expect(screen.getByTestId('amend-flip')).toHaveTextContent('Actually a session')

    await user.click(screen.getByTestId('amend-flip'))
    expect(p.attestCheckIn).toHaveBeenCalledWith(expect.objectContaining({ isRest: false }))
  })

  it('an empty day is not offered a flip', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.queryByTestId('amend-flip')).not.toBeInTheDocument()
  })

  it('nothing is clickable until a passphrase is typed', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.getByTestId('amend-showed-up')).toBeDisabled()
    expect(screen.getByTestId('amend-rest-day')).toBeDisabled()
  })

  it('arms the choices once a passphrase is typed', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.getByTestId('amend-showed-up')).toBeEnabled()
  })

  it('names what a validation refusal actually means', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'validation' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toHaveTextContent(/passphrase first/)
  })

  it('tells a parent a write failed rather than blaming the passphrase', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'write-failed' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toHaveTextContent(/didn't save/)
  })

  it('a cell announces its state, not just its weekday', () => {
    const row = lane({
      days: [
        day(MONDAY, { state: 'session' }),
        day(TUESDAY, { state: 'withdrawn' }),
        day(WEDNESDAY, { state: 'empty' }),
      ],
    })
    render(<AmendWeekGrid {...props([row])} />)

    expect(screen.getByTestId('amend-cell-lane-1-2026-09-28')).toHaveAccessibleName(/trained/)
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-29')).toHaveAccessibleName(/taken off the record/)
    expect(screen.getByTestId('amend-cell-lane-1-2026-09-30')).toHaveAccessibleName(/nothing on the record/)
  })

  it('an attested cell says so in its accessible name', () => {
    const row = lane({ days: [day(TUESDAY, { state: 'session', attested: true })] })
    render(<AmendWeekGrid {...props([row])} />)

    expect(screen.getByTestId('amend-cell-lane-1-2026-09-29')).toHaveAccessibleName(/witness/)
  })

  it('the withdraw control is offered for a rest day', async () => {
    const user = userEvent.setup()
    const row = lane({ days: [day(TUESDAY, { state: 'rest' })] })
    render(<AmendWeekGrid {...props([row])} />)

    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))

    expect(screen.getByTestId('amend-withdraw')).toBeInTheDocument()
  })

  it('"He showed up" attests the day with the typed passphrase', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(p.attestCheckIn).toHaveBeenCalledWith({
      laneId: 'lane-1',
      date: TUESDAY,
      isRest: false,
      note: null,
      passphrase: 'watched him',
    })
  })

  it('"Rest day" attests with isRest true', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-rest-day'))

    expect(p.attestCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ isRest: true })
    )
  })

  it('a typed note travels with the attestation', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.type(screen.getByTestId('amend-note'), 'I drove him')
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(p.attestCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'I drove him' })
    )
  })

  it('"This one didn\'t happen" withdraws the day', async () => {
    const user = userEvent.setup()
    const row = lane({ days: [day(TUESDAY, { state: 'session' })] })
    const p = props([row])
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-withdraw'))

    expect(p.withdrawCheckIn).toHaveBeenCalledWith({
      laneId: 'lane-1',
      date: TUESDAY,
      note: null,
      passphrase: 'watched him',
    })
  })

  it('closes the panel after a successful write', async () => {
    const user = userEvent.setup()
    render(<AmendWeekGrid {...props()} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.queryByTestId('amend-day-panel')).not.toBeInTheDocument()
  })

  it('names a passphrase mismatch', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'bad-passphrase' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toHaveTextContent("passphrase didn't match")
  })

  it('points at the account page when no passphrase is set', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'no-passphrase' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toHaveTextContent(/Account page/)
  })

  it('explains the window when a day is out of range', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'outside-window' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toHaveTextContent(/current week/)
  })

  it('falls back to a neutral message for an unknown error', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'kaboom' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toHaveTextContent(/another go/)
  })

  it('survives a rejected action rather than crashing the page', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockRejectedValue(new Error('nope')) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-error')).toBeInTheDocument()
  })

  it('keeps the passphrase after a failed write', async () => {
    const user = userEvent.setup()
    const p = { ...props(), attestCheckIn: vi.fn().mockResolvedValue({ ok: false, error: 'bad-passphrase' }) }
    render(<AmendWeekGrid {...p} />)

    await user.type(screen.getByTestId('amend-passphrase'), 'watched him')
    await user.click(screen.getByTestId('amend-cell-lane-1-2026-09-29'))
    await user.click(screen.getByTestId('amend-showed-up'))

    expect(screen.getByTestId('amend-passphrase')).toHaveValue('watched him')
  })

  it('marks an attested day as a witness statement', () => {
    const row = lane({ days: [day(TUESDAY, { state: 'session', attested: true })] })
    render(<AmendWeekGrid {...props([row])} />)

    const cell = screen.getByTestId('amend-cell-lane-1-2026-09-29')
    expect(cell).toHaveAttribute('title', expect.stringContaining('witness'))
    expect(cell.className).toContain('ring-amber-300')
  })

  it('does not mark a day the player tapped', () => {
    const row = lane({ days: [day(TUESDAY, { state: 'session', attested: false })] })
    render(<AmendWeekGrid {...props([row])} />)

    const cell = screen.getByTestId('amend-cell-lane-1-2026-09-29')
    expect(cell).toHaveAttribute('title', '2026-09-29')
    expect(cell.className).not.toContain('ring-amber-300')
  })

  it('masks the passphrase field', () => {
    render(<AmendWeekGrid {...props()} />)

    expect(screen.getByTestId('amend-passphrase')).toHaveAttribute('type', 'password')
  })

  it('uses no deficit language', () => {
    const row = lane({ days: [day(TUESDAY, { state: 'withdrawn' })] })
    render(<AmendWeekGrid {...props([row])} />)

    const text = screen.getByTestId('amend-grid').textContent ?? ''
    expect(text).not.toMatch(/missed|failed|deficit|cheat/i)
  })
})
