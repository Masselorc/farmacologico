import { describe, expect, it } from 'vitest'
import { calculateReconstitution } from '../../domain/reconstitution/calculate'
import { RECONSTITUTION_ENGINE_VERSION } from '../../domain/version'
import { formatDomainError } from '../../app/i18n/pt-BR.messages'

function syringe(overrides?: Partial<Parameters<typeof calculateReconstitution>[0]['syringe']>) {
  return {
    family: 'U-100' as const,
    capacityUnits: 100,
    unitsPerMl: 100 as const,
    graduationUnits: 1,
    ...overrides,
  }
}

describe('calculateReconstitution — âncoras normativas', () => {
  it('5 mg / 2 mL / 250 mcg ⇒ 2500 mcg/mL · 0,1 mL · 10 U · 20 teóricas (SEM warning de precisão)', () => {
    const result = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 250,
      syringe: syringe(),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.concentrationMcgPerMl).toBe(2500)
    expect(result.value.doseVolumeMl).toBeCloseTo(0.1, 15)
    expect(result.value.syringeUnits).toBeCloseTo(10, 12)
    expect(result.value.theoreticalMaxDoses).toBe(20)
    expect(result.value.capacityExceeded).toBe(false)
    // erroRel = 0,5·1/10 = 0,05 — no limite exato ⇒ SEM warning
    expect(result.value.warnings).toContain('THEORETICAL_YIELD')
    expect(result.value.warnings).not.toContain('LOW_SYRINGE_PRECISION')
    expect(result.value.metadata.reconstitutionEngineVersion).toBe(RECONSTITUTION_ENGINE_VERSION)
  })

  it('borda g=1: 9 U ⇒ warning; base do cálculo coerente', () => {
    const result = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 225,
      syringe: syringe(),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.syringeUnits).toBeCloseTo(9, 12)
    expect(result.value.warnings).toContain('LOW_SYRINGE_PRECISION')
  })

  it('5 mg / 2 mL / 3000 mcg ⇒ 120 U com CAPACITY_EXCEEDED', () => {
    const result = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 3000,
      syringe: syringe(),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.concentrationMcgPerMl).toBe(2500)
    expect(result.value.doseVolumeMl).toBeCloseTo(1.2, 15)
    expect(result.value.syringeUnits).toBeCloseTo(120, 10)
    expect(result.value.capacityExceeded).toBe(true)
    expect(result.value.warnings).toContain('CAPACITY_EXCEEDED')
    expect(result.value.theoreticalMaxDoses).toBe(1)
  })

  it('5 mg / 4 mL / 3000 mcg ⇒ 240 U', () => {
    const result = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 4,
      desiredDoseMcg: 3000,
      syringe: syringe({ capacityUnits: 500 }),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.concentrationMcgPerMl).toBe(1250)
    expect(result.value.doseVolumeMl).toBeCloseTo(2.4, 15)
    expect(result.value.syringeUnits).toBeCloseTo(240, 10)
  })

  it('dose acima do conteúdo do frasco ⇒ DOSE_EXCEEDS_VIAL_CONTENT bloqueante', () => {
    const result = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 6000,
      syringe: syringe(),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.map((e) => e.code)).toEqual(['DOSE_EXCEEDS_VIAL_CONTENT'])
  })

  it('DOSE_EXCEEDS usa vialTotalMcg no payload e na mensagem pt-BR', () => {
    const result = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 6000,
      syringe: syringe(),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error[0]?.params).toEqual({ desiredDoseMcg: 6000, vialTotalMcg: 5000 })
    expect(formatDomainError(result.error[0]!)).toContain('6000 mcg')
    expect(formatDomainError(result.error[0]!)).toContain('5000 mcg')
  })
})

describe('calculateReconstitution — validações', () => {
  const validBase = { vialMassMg: 5, diluentVolumeMl: 2, desiredDoseMcg: 250 }

  it.each([
    ['vialMassMg zerado', { ...validBase, vialMassMg: 0 }],
    ['volume negativo', { ...validBase, diluentVolumeMl: -2 }],
    ['dose NaN', { ...validBase, desiredDoseMcg: Number.NaN }],
    ['graduação zero', { ...validBase, syringe: syringe({ graduationUnits: 0 }) }],
    ['graduação acima do limite', { ...validBase, syringe: syringe({ graduationUnits: 100.5 }) }],
    ['unitsPerMl incorreto', { ...validBase, syringe: syringe({ unitsPerMl: 60 as never }) }],
  ])('%s ⇒ INVALID_RECONSTITUTION_INPUT', (_name, input) => {
    const result = calculateReconstitution(input as Parameters<typeof calculateReconstitution>[0])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.every((e) => e.code === 'INVALID_RECONSTITUTION_INPUT')).toBe(true)
    expect(result.error.length).toBeGreaterThanOrEqual(1)
  })

  it('graduação decimal 0,5 é aceita e pode gerar warning estrito', () => {
    const okCase = calculateReconstitution({
      ...validBase,
      syringe: syringe({ graduationUnits: 0.5 }),
    })
    expect(okCase.ok).toBe(true)

    const lowPrecision = calculateReconstitution({
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 25, // 0,01 mL → 1 U; erroRel=0,25 > 0,05
      syringe: syringe({ graduationUnits: 0.5 }),
    })
    expect(lowPrecision.ok).toBe(true)
    if (!lowPrecision.ok) return
    expect(lowPrecision.value.warnings).toContain('LOW_SYRINGE_PRECISION')
  })
})
