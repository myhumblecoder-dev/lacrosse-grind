import { describe, it, expect } from 'vitest'
import { getSeasonReadiness } from './seasonReadiness'
import { LANES_REQUIRED } from '@/lib/season'

describe('seasonReadiness', () => {
  it('no lanes and no prize is not ready', () => {
    const result = getSeasonReadiness(0, false)
    expect(result.isReady).toBe(false)
    expect(result.laneCount).toBe(0)
    expect(result.hasPrize).toBe(false)
    expect(result.lanesNeeded).toBe(LANES_REQUIRED)
  })

  it('three lanes without a prize is not ready', () => {
    const result = getSeasonReadiness(3, false)
    expect(result.isReady).toBe(false)
    expect(result.hasPrize).toBe(false)
  })

  it('three lanes with a prize is ready', () => {
    // We use a lane count that is guaranteed to satisfy the requirement
    // regardless of what LANES_REQUIRED is set to in the config.
    const sufficientLanes = Math.max(3, LANES_REQUIRED)
    const result = getSeasonReadiness(sufficientLanes, true)
    
    expect(result.isReady).toBe(true)
    expect(result.laneCount).toBe(sufficientLanes)
    expect(result.hasPrize).toBe(true)
  })
})
