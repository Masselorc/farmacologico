import { describe, expect, it } from 'vitest'
import { resolveProfileParameters } from '../../../features/library/lib/selection'
import type { PharmacokineticProfile } from '../../../domain/library/types'

describe('E10 — Profile Parameter Selection', () => {
  it('resolve perfil com parâmetros exatos sem exigir seleção', () => {
    const profile: PharmacokineticProfile = {
      id: 'p-1',
      route: 'unknown',
      halfLife: { value: 6, unit: 'days' },
      tmaxSpec: { kind: 'value', value: { value: 2, unit: 'days' } },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    const res = resolveProfileParameters(profile)
    expect(res.needsUserSelection).toBe(false)
    expect(res.missingFields).toEqual([])
    expect(res.selectedPkParameters.halfLifeMs).toBe(6 * 86400000)
    expect(res.selectedPkParameters.tmaxMs).toBe(2 * 86400000)
    expect(res.selectedPkParameters.selectionNote).toBeUndefined()
  })

  it('resolve tmaxSpec instant como tmaxMs=null', () => {
    const profile: PharmacokineticProfile = {
      id: 'p-instant',
      route: 'unknown',
      halfLife: { value: 12, unit: 'hours' },
      tmaxSpec: { kind: 'instant' },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    const res = resolveProfileParameters(profile)
    expect(res.needsUserSelection).toBe(false)
    expect(res.selectedPkParameters.tmaxMs).toBeNull()
    expect(res.pkParametersSnapshot.tmax).toBeNull()
  })

  it('exige seleção para tmaxSpec range e valida bounds normalizados', () => {
    const tmaxRange = {
      min: { value: 1, unit: 'days' as const },
      max: { value: 3, unit: 'days' as const },
    }
    const profile: PharmacokineticProfile = {
      id: 'p-range',
      route: 'unknown',
      halfLife: { value: 24, unit: 'hours' },
      tmaxSpec: {
        kind: 'range',
        range: tmaxRange,
      },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    // Sem seleção fornecida
    const resNoChoice = resolveProfileParameters(profile)
    expect(resNoChoice.needsUserSelection).toBe(true)
    expect(resNoChoice.missingFields).toContain('tmax')

    // Seleção fora do intervalo (4 dias > 3 dias) lança erro
    expect(() => {
      resolveProfileParameters(profile, {
        chosenTmax: { value: 4, unit: 'days' },
      })
    }).toThrow(/intervalo/i)

    // Seleção válida (2 dias) gera selectionNote e selectedFromRange
    const resValid = resolveProfileParameters(profile, {
      chosenTmax: { value: 2, unit: 'days' },
    })
    expect(resValid.needsUserSelection).toBe(false)
    expect(resValid.selectedPkParameters.tmaxMs).toBe(2 * 86400000)
    expect(resValid.selectedPkParameters.selectionNote?.range.tmaxRange).toEqual(tmaxRange)
    expect(resValid.selectedPkParameters.selectionNote?.chosenBy).toBe('user')
    expect(resValid.pkParametersSnapshot.selectedFromRange?.tmax).toEqual(tmaxRange)
  })

  it('exige seleção para tmaxSpec unknown e permite escolha explícita de valor ou instant', () => {
    const profile: PharmacokineticProfile = {
      id: 'p-unknown',
      route: 'unknown',
      halfLife: { value: 2, unit: 'days' },
      tmaxSpec: { kind: 'unknown' },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    const resMissing = resolveProfileParameters(profile)
    expect(resMissing.needsUserSelection).toBe(true)
    expect(resMissing.missingFields).toContain('tmax')

    const resInstant = resolveProfileParameters(profile, { chosenTmax: 'instant' })
    expect(resInstant.needsUserSelection).toBe(false)
    expect(resInstant.selectedPkParameters.tmaxMs).toBeNull()

    const resValue = resolveProfileParameters(profile, {
      chosenTmax: { value: 12, unit: 'hours' },
    })
    expect(resValue.needsUserSelection).toBe(false)
    expect(resValue.selectedPkParameters.tmaxMs).toBe(12 * 3600000)
  })
})
