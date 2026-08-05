import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrizeDisplay from './PrizeDisplay'

describe('PrizeDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title description and reasons', async () => {
    const props = {
      title: 'New Bike',
      description: 'A mountain bike for trails',
      reasons: ['Health', 'Adventure'],
      onEdit: vi.fn(),
      deletePrize: vi.fn(),
    }

    render(<PrizeDisplay {...props} />)

    expect(screen.getByRole('heading', { name: 'New Bike' })).toBeInTheDocument()
    expect(screen.getByText('A mountain bike for trails')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Adventure')).toBeInTheDocument()
  })

  it('renders the photo when present', async () => {
    const props = {
      title: 'New Bike',
      reasons: [],
      photoUrl: 'https://example.com/bike.jpg',
      onEdit: vi.fn(),
      deletePrize: vi.fn(),
    }

    render(<PrizeDisplay {...props} />)

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    // Use contains because Next.js Image wraps the URL in an optimized path
    expect(img.getAttribute('src')).toContain('https%3A%2F%2Fexample.com%2Fbike.jpg')
    expect(img).toHaveAttribute('alt', 'New Bike')
  })

  it('no photo element without a url', async () => {
    const props = {
      title: 'New Bike',
      reasons: [],
      photoUrl: null,
      onEdit: vi.fn(),
      deletePrize: vi.fn(),
    }

    render(<PrizeDisplay {...props} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('confirming delete calls deletePrize', async () => {
    const deletePrize = vi.fn().mockResolvedValue(undefined)
    const props = {
      title: 'New Bike',
      reasons: [],
      onEdit: vi.fn(),
      deletePrize,
    }

    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    render(<PrizeDisplay {...props} />)

    const deleteBtn = screen.getByRole('button', { name: 'Delete prize' })
    await user.click(deleteBtn)

    const confirmBtn = screen.getByRole('button', { name: 'Delete' })
    await user.click(confirmBtn)

    expect(deletePrize).toHaveBeenCalled()
  })
})
