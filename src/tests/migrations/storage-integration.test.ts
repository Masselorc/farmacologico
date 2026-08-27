import { describe, expect, it } from 'vitest'
import { previewHormoTrackerMigration, previewMeiavidaMigration } from '../../migrations'

describe('E7 fontes corrompidas', () => {
  it.each([
    ['HormoTracker', () => previewHormoTrackerMigration('{', { assumedTimeZone: 'UTC' })],
    ['Meia-vida', () => previewMeiavidaMigration('{', { assumedTimeZone: 'UTC' })],
  ])('%s não lança em JSON malformado e sinaliza quarentena', (_name, run) => {
    const preview = run()
    expect(preview.entities).toEqual([])
    expect(preview.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_SOURCE_INVALID_JSON', requiresQuarantine: true }))
  })
})
