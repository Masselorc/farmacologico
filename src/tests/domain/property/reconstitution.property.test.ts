import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { calculateReconstitution } from '../../../domain/reconstitution/calculate'
import { UX_LIMITS } from '../../../validation/limits'
import { amountClose } from '../../../domain/shared/tolerances'
import { forAllSeeds } from './helpers'

const syringeBase = {
  family: 'U-100' as const,
  capacityUnits: 1000,
  unitsPerMl: 100 as const,
  graduationUnits: 1,
}

describe('E4 reconstitution — invariantes por geração aleatória (faixa segura)', () => {
  it('volume·concentração=dose · unidades/volume=100 · floor teórico correto', () => {
    const property = fc.property(
      fc.double({ min: 0.05, max: 50_000, noNaN: true }), // vialMassMg
      fc.integer({ min: 1, max: 500 }), // diluentVolumeMl
      fc.integer({ min: 10, max: 200_000 }), // desiredDoseMcg (≤ massa·1000 garantido abaixo)
      (vialMassRaw, diluentVolumeMl, desiredDoseRaw) => {
        const totalMcg = vialMassRaw * 1000
        const desiredDoseMcg = Math.min(desiredDoseRaw, Math.floor(totalMcg * 0.999999))

        const result = calculateReconstitution({
          vialMassMg: vialMassRaw,
          diluentVolumeMl,
          desiredDoseMcg,
          syringe: syringeBase,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const value = result.value
        // Identidades algébricas com tolerâncias oficiais:
        expect(amountClose(value.concentrationMcgPerMl * value.doseVolumeMl, desiredDoseMcg)).toBe(true)
        expect(amountClose(value.doseVolumeMl * 100, value.syringeUnits)).toBe(true)
        expect(value.syringeUnits / value.doseVolumeMl).toBeCloseTo(100, 10)

        // Semântica exata do floor:
        const theoretical = value.theoreticalMaxDoses
        expect(theoretical * desiredDoseMcg).toBeLessThanOrEqual(totalMcg)
        expect((theoretical + 1) * desiredDoseMcg).toBeGreaterThan(totalMcg)

        expect(value.warnings).toContain('THEORETICAL_YIELD')
        expect(value.capacityExceeded).toBe(value.syringeUnits > syringeBase.capacityUnits)
      },
    )
    forAllSeeds(property, { numRuns: 300 })
  })

  it('monotonicidade normativa: diluente↑ ⇒ concentração↓ e volume/unidades↑', () => {
    const property = fc.property(
      fc.double({ min: 0.1, max: 50_000, noNaN: true }),
      fc.integer({ min: 1, max: 400 }),
      fc.integer({ min: 5, max: 100_000 }),
      (vialMassMg, diluentVolumeMl, desiredDoseMcg) => {
        const dose = Math.min(desiredDoseMcg, Math.floor(vialMassMg * 1000 * 0.99))
        if (dose <= 0) return

        const smaller = calculateReconstitution({
          vialMassMg,
          diluentVolumeMl,
          desiredDoseMcg: dose,
          syringe: { ...syringeBase, capacityUnits: Number.MAX_VALUE },
        })
        const larger = calculateReconstitution({
          vialMassMg,
          diluentVolumeMl: diluentVolumeMl + 250,
          desiredDoseMcg: dose,
          syringe: { ...syringeBase, capacityUnits: Number.MAX_VALUE },
        })
        expect(smaller.ok && larger.ok).toBe(true)
        if (!smaller.ok || !larger.ok) return

        // Propriedade essencial contra a inversão conceitual do legado antigo.
        expect(larger.value.concentrationMcgPerMl).toBeLessThan(smaller.value.concentrationMcgPerMl)
        expect(larger.value.doseVolumeMl).toBeGreaterThan(smaller.value.doseVolumeMl)
        expect(larger.value.syringeUnits).toBeGreaterThan(smaller.value.syringeUnits)
      },
    )
    forAllSeeds(property, { numRuns: 250 })
  })

  it('fronteira ESTRITA de 5% na graduação: >0,05 alerta; =0,05 não alerta', () => {
    const concentrationMcgPerMl = 2500 // 5 mg / 2 mL
    const unitsAtThreshold = 10 // erroRel = 0,5·1/10 = 0,05
    const unitsAbove = 9.9
    const unitsBelow = 10.1

    const thresholdErrorRel = (units: number): number => (0.5 * 1) / units

    expect(thresholdErrorRel(unitsAtThreshold)).toBe(UX_LIMITS.GRADUATION_ERROR_WARN_THRESHOLD)

    for (const [units, shouldWarn] of [
      [unitsAtThreshold, false],
      [unitsBelow, false],
      [unitsAbove, true],
      [5, true],
      [20, false],
    ] as Array<[number, boolean]>) {
      const desiredDoseMcg = ((units / 100) * concentrationMcgPerMl) as number
      const result = calculateReconstitution({
        vialMassMg: 5,
        diluentVolumeMl: 2,
        desiredDoseMcg,
        syringe: { ...syringeBase, capacityUnits: 100 },
      })
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.value.warnings.includes('LOW_SYRINGE_PRECISION')).toBe(shouldWarn)
    }
  })
})
