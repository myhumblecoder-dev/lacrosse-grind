import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SeasonSetupPanel from './SeasonSetupPanel'

describe('SeasonSetupPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('with no lanes and no prize neither step is marked done', async () => {
    render(<SeasonSetupPanel laneCount={0} lanesNeeded={3} hasPrize={false} />)
    expect(screen.getByText('Add 3 lanes (0/3)')).toBeInTheDocument()
    expect(screen.getByText('Set your prize')).toBeInTheDocument()
    expect(screen.queryByTestId('step-done')).toBeNull()
  })

  it('with enough lanes the lanes step is marked done', async () => {
    render(<SeasonSetupPanel laneCount={3} lanesNeeded={3} hasPrize={false} />)
    expect(screen.getByText('Add 3 lanes (3/3)')).toBeInTheDocument()
    expect(screen.getByTestId('step-done')).toBeInTheDocument()
  })

  it('with a prize the prize step is marked done', async () => {
    render(<SeasonSetupPanel laneCount={1} lanesNeeded={3} hasPrize={true} />)
    expect(screen.getByText('Set your prize')).toBeInTheDocument()
    expect(screen.getByTestId('step-done')).toBeInTheDocument()
  })
})