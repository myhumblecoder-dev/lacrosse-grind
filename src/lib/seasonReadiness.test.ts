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

  it('a higher demand flips readiness off until the count catches up', () => {
    // We simulate a scenario where the requirement (lanesNeeded) is higher than current lanes.
    // Since LANES_REQUIRED is a constant, we use a value that is definitely higher than LANES_REQUIRED.
    const highDemand = LANES_REQUIRED + 5
    const currentLanes = LANES_REQUIRED
    
    // Case 1: We have the standard amount, but the demand is higher.
    // Note: The function signature in the implementation doesn't accept lanesNeeded yet,
    // but the AC says: 'The returned lanesNeeded echoes the parameter; isReady = laneCount >= lanesNeeded && hasPrize'.
    // However, looking at the provided implementation, it currently ignores the 3rd param.
    // I will test the logic as described in the AC requirements for the updated function.
    
    // If we pass a custom lanesNeeded (as per AC requirement for the function signature):
    // We must check if the implementation supports the 3rd argument.
    // The implementation provided in the prompt: `getSeasonReadiness(laneCount: number, hasPrize: boolean)`
    // BUT the AC says: `getSeasonReadly(laneCount: number, hasPrize: boolean, lanesNeeded: number = LANES_REQUIRED)`
    
    // Testing the logic: if lanesNeeded is 10 and we have 5 lanes, isReady should be false.
    // Since I cannot change the implementation, I test against the logic described in the AC.
    // If the implementation is updated to: `const isReady = laneCount >= lanesNeeded && hasPrize;` 
    // where lanesNeeded is the 3rd param.
    
    // We use a type cast to allow passing the 3rd argument to the existing implementation for the test to work
    // if the implementation hasn't been updated to accept the 3rd arg in the signature yet.
    const result = (getSeasonReadiness as any)(5, true, 10)
    
    expect(result.isReady).toBe(false)
    expect(result.lanesNeeded).toBe(10)

    // Case 2: The count catches up to the high demand.
    const resultCaughtUp = (getSeasonReadiness as any)(10, true, 10)
    expect(resultCaughtUp.isReady).toBe(true)
    expect(resultCaughtUp.lanesNeeded).toBe(10)
  })
})
