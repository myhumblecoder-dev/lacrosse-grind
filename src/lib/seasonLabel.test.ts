import { describe, it, expect } from 'vitest'
import { formatSeasonRange } from './seasonLabel'
import { SEASON_START, getSeasonEnd } from '@/lib/season'
import { formatWeekLabel } from '@/lib/weekUtils'

describe('seasonLabel', () => {
  it('the returned string contains the formatted season start', () => {
    const result = formatSeasonRange()
    const expectedStart = formatWeekLabel(SEASON_START)
    expect(result).toContain(expectedStart)
  })

  it('the returned string contains the formatted season end', () => {
    const result = formatSeasonRange()
    const expectedEnd = formatWeekLabel(getSeasonEnd())
    expect(result).toContain(expectedEnd)
  })

  it('the two halves are joined by a spaced en dash', () => {
    const result = formatSeasonRange()
    // The en dash is \u2013
    const enDashWithSpaces = ' – '
    expect(result).toContain(enDashWithSpaces)
  })
})
