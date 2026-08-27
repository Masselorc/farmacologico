import { describe, expect, it } from 'vitest'
import { protocolSchema } from '../../validation/schemas/protocol'
import { previewHormoTrackerMigration } from '../../migrations'

const schedule = { startDate: '2026-08-27', startTime: '08:00', type: 'weekly', daysOfWeek: [0, 1, 6], weeksCount: 8 }
const component = (id: string, dose: number, halfLife: number, tmax: number, label: string, color: string) => ({
  id, groupId: 'durateston', blendName: 'Durateston LANDERGOLD', componentLabel: label, name: label,
  dose, halfLife, tmax, color, ...schedule,
})

describe('E7 HormoTracker', () => {
  it('aceita envelope v2, agrupa LANDERGOLD e preserva PK individual', () => {
    const raw = { schemaVersion: 2, protocols: [
      component('prop', 20, 2, 0.229167, 'Propionato', '#1abc9c'),
      component('fenil', 40, 3, 2, 'Fenilpropionato', '#2ecc71'),
      component('iso', 40, 8, 1.5, 'Isocaproato', '#27ae60'),
    ] }
    const preview = previewHormoTrackerMigration(raw, { assumedTimeZone: 'America/Sao_Paulo', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toHaveLength(1)
    expect(preview.entities[0]?.totalDoseMg).toBe(100)
    expect(preview.entities[0]?.components.map((item) => item.proportion)).toEqual([0.4, 0.4, 0.2])
    expect(preview.entities[0]?.components.map((item) => item.selectedPkParameters.halfLifeMs).sort((a, b) => a - b)).toEqual([172800000, 259200000, 691200000])
    expect(preview.entities[0]?.schedule.startDate).toBe('2026-08-27')
    expect(preview.entities[0]?.schedule.recurrence).toEqual({ type: 'weekly', weekdays: [1, 6, 7], weeks: 8 })
    expect(protocolSchema.safeParse(preview.entities[0]).success).toBe(true)
  })

  it('remove sibling de dose inválida antes de recalcular proporções', () => {
    const preview = previewHormoTrackerMigration([
      component('a', 20, 2, 0, 'A', '#3498db'), component('b', -1, 3, 0, 'B', '#3498db'), component('c', 40, 4, 0, 'C', '#3498db'),
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities[0]?.totalDoseMg).toBe(60)
    expect(preview.entities[0]?.components.map((item) => item.proportion)).toEqual([1 / 3, 2 / 3])
    expect(preview.discardedCount).toBe(1)
  })

  it('rejeita grupo vazio, 21 survivors, semanas fracionárias e agenda divergente', () => {
    const allInvalid = previewHormoTrackerMigration([component('a', -1, 2, 0, 'A', '#3498db')], { assumedTimeZone: 'UTC' })
    expect(allInvalid.issues.some((item) => item.code === 'LEGACY_GROUP_EMPTY' && item.requiresQuarantine)).toBe(true)
    const tooMany = previewHormoTrackerMigration(Array.from({ length: 21 }, (_, index) => component(String(index), 1, 2, 0, `C${index}`, '#3498db')), { assumedTimeZone: 'UTC' })
    expect(tooMany.entities).toEqual([])
    expect(tooMany.issues.some((item) => item.code === 'LEGACY_GROUP_COMPONENT_LIMIT')).toBe(true)
    const fractional = previewHormoTrackerMigration([{ ...component('x', 1, 2, 0, 'X', '#3498db'), weeksCount: 1.5 }], { assumedTimeZone: 'UTC' })
    expect(fractional.entities).toEqual([])
    const divergent = previewHormoTrackerMigration([component('a', 1, 2, 0, 'A', '#3498db'), { ...component('b', 1, 2, 0, 'B', '#3498db'), startTime: '09:00' }], { assumedTimeZone: 'UTC' })
    expect(divergent.issues.some((item) => item.code === 'LEGACY_GROUP_INCONSISTENT_SCHEDULE')).toBe(true)
  })

  it('é determinístico e usa manual para zero ou múltiplos matches', () => {
    const raw = [{ id: 'x', name: 'X', dose: 1, halfLife: 2, tmax: 0, startDate: '2026-08-27', type: 'single', color: '#3498db' }]
    const options = { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' }
    expect(previewHormoTrackerMigration(raw, options)).toEqual(previewHormoTrackerMigration(raw, options))
    const ambiguous = previewHormoTrackerMigration(raw, { ...options, resolver: { resolve: () => [
      { substanceId: 's1', profileId: 'p1', datasetVersion: 1 }, { substanceId: 's2', profileId: 'p2', datasetVersion: 1 },
    ] } })
    expect(ambiguous.entities[0]?.components[0]?.source.type).toBe('manual')
    const unique = previewHormoTrackerMigration(raw, { ...options, resolver: { resolve: () => [
      { substanceId: 's1', profileId: 'p1', datasetVersion: 1 },
    ] } })
    expect(unique.entities[0]?.components[0]?.source.type).toBe('library')
  })

  it('expande isBlend/esters sem calcular PK média', () => {
    const preview = previewHormoTrackerMigration([{
      id: 'old-blend', name: 'Blend antigo', blendName: 'Blend antigo', isBlend: true, dose: 100,
      startDate: '2026-08-27', type: 'single', color: '#3498db', esters: [
        { id: 'a', name: 'A', proportion: 0.25, halfLife: 2, tmax: 0, color: '#1abc9c' },
        { id: 'b', name: 'B', proportion: 0.75, halfLife: 8, tmax: 1, color: '#27ae60' },
      ],
    }], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities[0]?.components.map((item) => item.proportion)).toEqual([0.25, 0.75])
    expect(preview.entities[0]?.components.map((item) => item.selectedPkParameters.halfLifeMs)).toEqual([172800000, 691200000])
  })
})
