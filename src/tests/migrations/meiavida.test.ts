import { describe, expect, it } from 'vitest'
import { previewMeiavidaMigration } from '../../migrations'
import { scenarioSchema } from '../../validation/schemas/scenario'

const base = {
  id: 's', name: 'Cenário', color: '#2563eb', halfLifeValue: 24, halfLifeUnit: 'hours',
  tmaxValue: 4, tmaxUnit: 'hours', displayUnit: 'mg', doses: [],
}

describe('E7 Meia-vida', () => {
  it('converte unidades, tmax zero e valida schema', () => {
    const preview = previewMeiavidaMigration({ schemaVersion: 2, scenarios: [base, { ...base, id: 'zero', tmaxValue: 0, tmaxUnit: 'minutes' }] }, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities[0]?.selectedPkParameters).toEqual({ halfLifeMs: 86400000, tmaxMs: 14400000 })
    expect(preview.entities[1]?.selectedPkParameters.tmaxMs).toBeNull()
    expect(preview.entities.every((item) => scenarioSchema.safeParse(item).success)).toBe(true)
    expect(preview.entities.every((item) => item.source.type === 'manual')).toBe(true)
  })

  it('descarta tmax null e somente doses inválidas', () => {
    const invalidScenario = previewMeiavidaMigration({ schemaVersion: 2, scenarios: [{ ...base, tmaxValue: null }] }, { assumedTimeZone: 'UTC' })
    expect(invalidScenario.entities).toEqual([])
    const preview = previewMeiavidaMigration({ schemaVersion: 2, scenarios: [{ ...base, doses: [
      { id: 'ok', amountMg: 10, time: '2026-08-27T10:00' }, { id: 'null', amountMg: null, time: '2026-08-27T10:00' },
      { id: 'neg', amountMg: -1, time: '2026-08-27T10:00' }, { id: 'inf', amountMg: Number.POSITIVE_INFINITY, time: '2026-08-27T10:00' },
      { id: 'time', amountMg: 1, time: 'inválido' },
    ] }] }, { assumedTimeZone: 'UTC' })
    expect(preview.entities[0]?.doses).toHaveLength(1)
    expect(preview.discardedCount).toBe(4)
  })

  it('aplica política Temporal para GAP e OVERLAP', () => {
    const preview = previewMeiavidaMigration({ schemaVersion: 2, scenarios: [{ ...base, doses: [
      { id: 'gap', amountMg: 1, time: '2026-03-08T02:30' }, { id: 'overlap', amountMg: 1, time: '2026-11-01T01:30' },
    ] }] }, { assumedTimeZone: 'America/New_York' })
    expect(preview.entities[0]?.doses.map((dose) => dose.time)).toEqual(['2026-03-08T07:30:00Z', '2026-11-01T05:30:00Z'])
  })

  it('usa library somente para exatamente um match válido', () => {
    const preview = previewMeiavidaMigration({ schemaVersion: 2, scenarios: [base] }, {
      assumedTimeZone: 'UTC',
      resolver: { resolve: () => [{ substanceId: 'sub', profileId: 'profile', datasetVersion: 3 }] },
    })
    expect(preview.entities[0]?.source).toEqual(expect.objectContaining({ type: 'library', substanceId: 'sub', profileId: 'profile', datasetVersion: 3 }))
  })
})
