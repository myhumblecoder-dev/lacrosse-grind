import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrizePhotoInput from './PrizePhotoInput'

// jsdom has no object-URL implementation; the component only uses it for the
// local preview, so a stub keeps the assertions about behaviour not plumbing.
beforeEach(() => {
  vi.clearAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
})

const imageFile = () =>
  new File(['fake-bytes'], 'ps5.png', { type: 'image/png' })

describe('PrizePhotoInput', () => {
  it('selecting a file reports it and shows a preview', async () => {
    const onChange = vi.fn()
    render(<PrizePhotoInput onChange={onChange} />)

    const file = imageFile()
    await userEvent.upload(screen.getByTestId('prize-photo-file'), file)

    expect(onChange).toHaveBeenCalledWith({ file })
    expect(screen.getByTestId('prize-photo-preview')).toHaveAttribute('src', 'blob:preview')
  })

  it('dropping a file reports it', async () => {
    const onChange = vi.fn()
    render(<PrizePhotoInput onChange={onChange} />)

    const file = imageFile()
    fireEvent.drop(screen.getByTestId('prize-photo-dropzone'), {
      dataTransfer: { files: [file] },
    })

    expect(onChange).toHaveBeenCalledWith({ file })
  })

  it('rejects a non-image file', async () => {
    const onChange = vi.fn()
    render(<PrizePhotoInput onChange={onChange} />)

    const notAnImage = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.drop(screen.getByTestId('prize-photo-dropzone'), {
      dataTransfer: { files: [notAnImage] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('not an image')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('rejects a file over 5 MB', async () => {
    const onChange = vi.fn()
    render(<PrizePhotoInput onChange={onChange} />)

    const big = new File(['x'], 'huge.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.drop(screen.getByTestId('prize-photo-dropzone'), {
      dataTransfer: { files: [big] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('bigger than 5 MB')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('pasting a url reports it and previews it', async () => {
    const onChange = vi.fn()
    render(<PrizePhotoInput onChange={onChange} />)

    await userEvent.type(screen.getByTestId('prize-photo-url'), 'https://x.test/a.png')

    expect(onChange).toHaveBeenLastCalledWith({ url: 'https://x.test/a.png' })
    expect(screen.getByTestId('prize-photo-preview')).toHaveAttribute(
      'src',
      'https://x.test/a.png'
    )
  })

  it('clearing a url restores the existing photo', async () => {
    const onChange = vi.fn()
    render(<PrizePhotoInput existingPhotoUrl="https://old.test/p.png" onChange={onChange} />)

    const urlInput = screen.getByTestId('prize-photo-url')
    await userEvent.type(urlInput, 'https://x.test/a.png')
    await userEvent.clear(urlInput)

    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByTestId('prize-photo-preview')).toHaveAttribute(
      'src',
      'https://old.test/p.png'
    )
  })

  it('shows the existing photo when there is no selection', () => {
    render(<PrizePhotoInput existingPhotoUrl="https://old.test/p.png" onChange={vi.fn()} />)

    expect(screen.getByTestId('prize-photo-preview')).toHaveAttribute(
      'src',
      'https://old.test/p.png'
    )
  })
})
