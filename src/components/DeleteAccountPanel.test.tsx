import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DeleteAccountPanel from './DeleteAccountPanel'

const props = () => ({
  confirmation: 'DELETE',
  deleteAccount: vi.fn().mockResolvedValue(undefined),
})

describe('DeleteAccountPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('will not fire until the word is typed', async () => {
    render(<DeleteAccountPanel {...props()} />)

    expect(screen.getByTestId('delete-account-submit')).toBeDisabled()
  })

  it('stays disabled for something close but wrong', async () => {
    const user = userEvent.setup()
    render(<DeleteAccountPanel {...props()} />)

    await user.type(screen.getByTestId('delete-confirm-input'), 'delete')

    expect(screen.getByTestId('delete-account-submit')).toBeDisabled()
  })

  it('arms once the word matches, and passes it on', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<DeleteAccountPanel {...p} />)

    await user.type(screen.getByTestId('delete-confirm-input'), 'DELETE')
    await user.click(screen.getByTestId('delete-account-submit'))

    expect(p.deleteAccount).toHaveBeenCalledWith('DELETE')
  })

  it('says what is about to go, in plain terms', async () => {
    render(<DeleteAccountPanel {...props()} />)

    expect(screen.getByTestId('delete-account')).toHaveTextContent(/cannot be undone/)
  })

  it('surfaces a refusal rather than looking like it worked', async () => {
    const user = userEvent.setup()
    const p = props()
    p.deleteAccount.mockResolvedValue({ ok: false, error: 'not-confirmed' })
    render(<DeleteAccountPanel {...p} />)

    await user.type(screen.getByTestId('delete-confirm-input'), 'DELETE')
    await user.click(screen.getByTestId('delete-account-submit'))

    expect(await screen.findByTestId('delete-account-error')).toBeInTheDocument()
  })
})
