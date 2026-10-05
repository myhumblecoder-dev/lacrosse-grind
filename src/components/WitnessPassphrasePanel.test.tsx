import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WitnessPassphrasePanel from './WitnessPassphrasePanel'

const props = () => ({
  isSet: false,
  minLength: 6,
  setWitnessPassphrase: vi.fn().mockResolvedValue({ ok: true }),
})

describe('WitnessPassphrasePanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts disabled with both fields empty', () => {
    render(<WitnessPassphrasePanel {...props()} />)

    expect(screen.getByTestId('witness-passphrase-submit')).toBeDisabled()
  })

  it('stays disabled while the two fields differ', async () => {
    const user = userEvent.setup()
    render(<WitnessPassphrasePanel {...props()} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched her')

    expect(screen.getByTestId('witness-passphrase-submit')).toBeDisabled()
  })

  it('says so when the confirmation differs', async () => {
    const user = userEvent.setup()
    render(<WitnessPassphrasePanel {...props()} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched her')

    expect(screen.getByTestId('witness-passphrase-error')).toHaveTextContent(
      /don't match/
    )
  })

  it('stays quiet about a mismatch until the second field is started', async () => {
    const user = userEvent.setup()
    render(<WitnessPassphrasePanel {...props()} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')

    expect(screen.queryByTestId('witness-passphrase-error')).not.toBeInTheDocument()
  })

  it('stays disabled for a matching pair below the minimum length', async () => {
    const user = userEvent.setup()
    render(<WitnessPassphrasePanel {...props()} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'short')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'short')

    expect(screen.getByTestId('witness-passphrase-submit')).toBeDisabled()
  })

  it('arms once the two match and are long enough', async () => {
    const user = userEvent.setup()
    render(<WitnessPassphrasePanel {...props()} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched him')

    expect(screen.getByTestId('witness-passphrase-submit')).toBeEnabled()
  })

  it('sends the typed passphrase', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<WitnessPassphrasePanel {...p} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched him')
    await user.click(screen.getByTestId('witness-passphrase-submit'))

    expect(p.setWitnessPassphrase).toHaveBeenCalledWith('watched him')
  })

  it('confirms and clears both fields on success', async () => {
    const user = userEvent.setup()
    render(<WitnessPassphrasePanel {...props()} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched him')
    await user.click(screen.getByTestId('witness-passphrase-submit'))

    expect(screen.getByTestId('witness-passphrase-saved')).toBeInTheDocument()
    expect(screen.getByTestId('witness-passphrase-input')).toHaveValue('')
  })

  it('says something went wrong when the action refuses', async () => {
    const user = userEvent.setup()
    const p = { ...props(), setWitnessPassphrase: vi.fn().mockResolvedValue({ ok: false }) }
    render(<WitnessPassphrasePanel {...p} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched him')
    await user.click(screen.getByTestId('witness-passphrase-submit'))

    expect(screen.getByTestId('witness-passphrase-error')).toBeInTheDocument()
    expect(screen.queryByTestId('witness-passphrase-saved')).not.toBeInTheDocument()
  })

  it('survives a rejected action rather than crashing the page', async () => {
    const user = userEvent.setup()
    const p = { ...props(), setWitnessPassphrase: vi.fn().mockRejectedValue(new Error('nope')) }
    render(<WitnessPassphrasePanel {...p} />)

    await user.type(screen.getByTestId('witness-passphrase-input'), 'watched him')
    await user.type(screen.getByTestId('witness-passphrase-confirm'), 'watched him')
    await user.click(screen.getByTestId('witness-passphrase-submit'))

    expect(screen.getByTestId('witness-passphrase-error')).toBeInTheDocument()
  })

  it('reads as setting a first passphrase when none exists', () => {
    render(<WitnessPassphrasePanel {...props()} isSet={false} />)

    expect(screen.getByTestId('witness-passphrase-submit')).toHaveTextContent('Set passphrase')
  })

  it('reads as changing one when a passphrase is already set', () => {
    render(<WitnessPassphrasePanel {...props()} isSet />)

    expect(screen.getByTestId('witness-passphrase-submit')).toHaveTextContent('Change passphrase')
  })

  it('never asks for the current passphrase', () => {
    render(<WitnessPassphrasePanel {...props()} isSet />)

    expect(screen.getByTestId('witness-passphrase')).not.toHaveTextContent(/current passphrase/i)
  })

  it('names the minimum length it was given', () => {
    render(<WitnessPassphrasePanel {...props()} minLength={9} />)

    expect(screen.getByTestId('witness-passphrase')).toHaveTextContent(/at least 9 characters/)
  })

  it('masks both fields', () => {
    render(<WitnessPassphrasePanel {...props()} />)

    expect(screen.getByTestId('witness-passphrase-input')).toHaveAttribute('type', 'password')
    expect(screen.getByTestId('witness-passphrase-confirm')).toHaveAttribute('type', 'password')
  })

  it('tells a parent who already set one that forgetting it is survivable', () => {
    render(<WitnessPassphrasePanel {...props()} isSet />)

    expect(screen.getByTestId('witness-passphrase-forgot')).toHaveTextContent(
      /do not need\s+the old one/
    )
  })

  it('says nothing about forgetting before one has been set', () => {
    render(<WitnessPassphrasePanel {...props()} isSet={false} />)

    expect(screen.queryByTestId('witness-passphrase-forgot')).not.toBeInTheDocument()
  })
})
