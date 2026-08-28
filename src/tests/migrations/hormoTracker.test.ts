import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { protocolSchema } from '../../validation/schemas/protocol'
import { previewHormoTrackerMigration } from '../../migrations'

const schedule = { startDate: '2026-08-27', startTime: '08:00', type: 'weekly', daysOfWeek: [0, 1, 6], weeksCount: 8 }
const component = (id: string, dose: number, halfLife: number, tmax: number, label: string, color: string) => ({
  id, groupId: 'durateston', blendName: 'Durateston LANDERGOLD', componentLabel: label, name: label,
  dose, halfLife, tmax, color, ...schedule,
})

describe('E7 HormoTracker', () => {
  it('reconstrói o LANDERGOLD histórico sem groupId somente no array direto', () => {
    const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-landergold.json'), 'utf8'))
    if (!Array.isArray(raw)) throw new Error('fixture inválida')
    const preview = previewHormoTrackerMigration(raw, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toHaveLength(1)
    expect(preview.entities[0]?.name).toBe('Durateston LANDERGOLD')
    expect(preview.entities[0]?.totalDoseMg).toBe(100)
    const byLabel = new Map(preview.entities[0]?.components.map((item) => [item.label, item]))
    expect(byLabel.get('Propionato')?.proportion).toBeCloseTo(0.2)
    expect(byLabel.get('Fenilpropionato')?.proportion).toBeCloseTo(0.4)
    expect(byLabel.get('Isocaproato')?.proportion).toBeCloseTo(0.4)
    expect(byLabel.get('Propionato')?.pkParametersSnapshot.halfLife.value).toBe(2)
    expect(byLabel.get('Fenilpropionato')?.pkParametersSnapshot.halfLife.value).toBe(3)
    expect(byLabel.get('Isocaproato')?.pkParametersSnapshot.halfLife.value).toBe(8)
    expect(preview.entities[0]?.schedule.recurrence).toEqual({ type: 'weekly', weekdays: [1, 6, 7], weeks: 8 })
    expect(preview.entities[0]?.schedule.startDate).toBe('2026-08-27')

    const repeated = previewHormoTrackerMigration(raw, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const reversed = previewHormoTrackerMigration([...raw].reverse(), { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(repeated).toEqual(preview)
    expect(reversed.entities[0]?.id).toBe(preview.entities[0]?.id)
    expect(new Map(reversed.entities[0]?.components.map((item) => [item.label, item.id]))).toEqual(
      new Map(preview.entities[0]?.components.map((item) => [item.label, item.id])),
    )

    const envelope = previewHormoTrackerMigration({ schemaVersion: 2, protocols: raw }, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(envelope.entities).toHaveLength(3)
  })

  it('preserva os valores persistidos em vez de substituir pelo preset de identificação', () => {
    const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-landergold.json'), 'utf8'))
    if (!Array.isArray(raw)) throw new Error('fixture inválida')
    const changed = raw.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return item
      return { ...item, dose: [20, 30, 50][index], halfLife: [2.25, 3.25, 8.25][index], tmax: [0.25, 2.25, 1.75][index] }
    })
    const preview = previewHormoTrackerMigration(changed, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const byLabel = new Map(preview.entities[0]?.components.map((item) => [item.label, item]))
    expect(byLabel.get('Fenilpropionato')?.proportion).toBeCloseTo(0.3)
    expect(byLabel.get('Isocaproato')?.proportion).toBeCloseTo(0.5)
    expect(byLabel.get('Propionato')?.pkParametersSnapshot.halfLife.value).toBe(2.25)
  })

  it('separa duas administrações históricas pela base numérica dos IDs', () => {
    const first: unknown = JSON.parse(readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-landergold.json'), 'utf8'))
    if (!Array.isArray(first)) throw new Error('fixture inválida')
    const second = first.map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return item
      return { ...item, id: Number(item.id) + 100 }
    })
    const preview = previewHormoTrackerMigration([...first, ...second], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toHaveLength(2)
    expect(preview.entities.every((protocol) => protocol.components.length === 3)).toBe(true)
  })

  it('detecta metadados explícitos antes do nome histórico', () => {
    const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-landergold.json'), 'utf8'))
    if (!Array.isArray(raw)) throw new Error('fixture inválida')
    const keys = ['propionato', 'fenilpropionato', 'isocaproato']
    const explicit = raw.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return item
      return {
        ...item,
        name: `Componente legado ${index}`,
        blendKey: 'durateston-landergold',
        blendName: 'Durateston LANDERGOLD',
        componentKey: keys[index],
      }
    })
    const preview = previewHormoTrackerMigration(explicit, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toHaveLength(1)
    expect(preview.entities[0]?.components).toHaveLength(3)
  })

  it('mantém o grupo inferido ao descartar dose inválida, rejeitar grupo vazio e detectar agenda divergente', () => {
    const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-landergold.json'), 'utf8'))
    if (!Array.isArray(raw)) throw new Error('fixture inválida')
    const invalidSibling = raw.map((item, index) =>
      typeof item === 'object' && item !== null && !Array.isArray(item) && index === 1 ? { ...item, dose: -1 } : item,
    )
    const survivors = previewHormoTrackerMigration(invalidSibling, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const survivorByLabel = new Map(survivors.entities[0]?.components.map((item) => [item.label, item]))
    expect(survivors.entities).toHaveLength(1)
    expect(survivors.entities[0]?.totalDoseMg).toBe(60)
    expect(survivorByLabel.get('Propionato')?.proportion).toBeCloseTo(1 / 3)
    expect(survivorByLabel.get('Isocaproato')?.proportion).toBeCloseTo(2 / 3)
    expect(survivors.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_PROTOCOL_INVALID_DOSE' }))
    expect(survivors.issues.some((item) => item.code === 'LEGACY_GROUP_EMPTY')).toBe(false)

    const allInvalid = raw.map((item) => typeof item === 'object' && item !== null && !Array.isArray(item) ? { ...item, dose: -1 } : item)
    const empty = previewHormoTrackerMigration(allInvalid, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(empty.entities).toEqual([])
    expect(empty.colorRemaps).toEqual([])
    expect(empty.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_GROUP_EMPTY', requiresQuarantine: true }))

    const divergent = raw.map((item, index) =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
        ? { ...item, startTime: index === 1 ? '09:00' : '08:00', color: '#000001' }
        : item,
    )
    const inconsistent = previewHormoTrackerMigration(divergent, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(inconsistent.entities).toEqual([])
    expect(inconsistent.colorRemaps).toEqual([])
    expect(inconsistent.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_GROUP_INCONSISTENT_SCHEDULE', requiresQuarantine: true }))
  })

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

  it('aceita o formato histórico isBlend com ester key + suffix, sem name', () => {
    const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-isblend.json'), 'utf8'))
    const preview = previewHormoTrackerMigration(raw, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toHaveLength(1)
    expect(preview.entities[0]?.name).toBe('Durateston LANDERGOLD')
    expect(preview.entities[0]?.components.map((item) => item.label).sort()).toEqual(['Fenilpropionato', 'Isocaproato', 'Propionato'])
    expect(preview.entities[0]?.components.map((item) => item.proportion).sort((a, b) => a - b)).toEqual([0.2, 0.4, 0.4])
    expect(preview.entities[0]?.components.every((item) => item.source.type === 'manual')).toBe(true)
    expect(preview.issues.some((item) => item.code === 'LEGACY_GROUP_EMPTY')).toBe(false)
    expect(protocolSchema.safeParse(preview.entities[0]).success).toBe(true)
  })
})
