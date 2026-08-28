import { describe, expect, it } from 'vitest'
import { nearestPaletteColor, previewHormoTrackerMigration } from '../../migrations'

describe('E7 cores legadas', () => {
  it('resolve empate pelo menor id, independentemente da ordem', () => {
    const palette = [{ id: 'z', hex: '#000000' }, { id: 'a', hex: '#000002' }]
    expect(nearestPaletteColor('#000001', palette)).toBe('a')
    expect(nearestPaletteColor('#000001', [...palette].reverse())).toBe('a')
  })

  it('remapeia hex válido externo e apenas faz fallback para cor inválida', () => {
    const base = { id: 'x', name: 'X', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single' }
    const remapped = previewHormoTrackerMigration([{ ...base, color: '#000001' }], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(remapped.colorRemaps).toHaveLength(1)
    expect(remapped.entities).toHaveLength(1)
    const invalid = previewHormoTrackerMigration([{ ...base, color: 'red' }], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(invalid.entities[0]?.components[0]?.displayColor.paletteColor).toBe('#3498db')
    expect(invalid.colorRemaps).toEqual([])
  })

  it('não publica remap de Protocol rejeitado pelo schema', () => {
    const shared = {
      groupId: 'duplicado', componentKey: 'mesmo-componente', halfLife: 1, tmax: 0, dose: 1,
      startDate: '2026-08-27', type: 'single', color: '#000001',
    }
    const preview = previewHormoTrackerMigration([
      { ...shared, name: 'A' }, { ...shared, name: 'B' },
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toEqual([])
    expect(preview.colorRemaps).toEqual([])
  })
})
