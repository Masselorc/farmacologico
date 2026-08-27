import { describe, expect, it } from 'vitest'
import { mapLegacyJsWeekdays } from '../../migrations'

describe('E7 weekday JS → ISO', () => {
  it.each([
    [[0], [7]], [[1], [1]], [[6], [6]], [[0, 1, 6], [1, 6, 7]], [[6, 0, 1, 0, 6], [1, 6, 7]],
  ])('mapeia %j para %j', (legacy, expected) => expect(mapLegacyJsWeekdays(legacy)).toEqual(expected))

  it.each([[-1], [7], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY], ['domingo']])('rejeita %j', (legacy) => {
    expect(mapLegacyJsWeekdays(legacy)).toBeNull()
  })
})
