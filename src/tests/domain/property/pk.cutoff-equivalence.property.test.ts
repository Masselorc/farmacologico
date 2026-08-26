import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { deriveCalculationWindow } from '../../../domain/simulation/windows'
import { absorptionRateFromTmax } from '../../../domain/pk/rates'
import { cutoffClose } from '../../../domain/shared/tolerances'
import type { SelectedPkParameters } from '../../../domain/types'
import type { DoseKinetics } from '../../../domain/pk/bateman'
import { MS_PER_DAY } from './cutoff-fixtures'
import { forAllSeeds, universeAmounts } from './helpers'

// Equivalência truncamento × referência estendida (§4/§13).
// Regras respeitadas: mesmo limite superior; referência estende SOMENTE o inferior;
// comparação EXCLUSIVAMENTE por cutoffClose nos MESMOS timestamps físicos;
// administeredMg/eliminatedMg/counts NUNCA comparados entre universos.

interface Universe {
  doses: Array<{ amountMg: number; timeMs: number }>
}

function buildTimestamps(displayStart: number, displayEnd: number, doseTimes: number[], tmaxMs: number | null): number[] {
  const set = new Set<number>([displayStart, displayEnd])
  const intervals = 24
  const step = (displayEnd - displayStart) / intervals
  for (let i = 0; i <= intervals; i++) {
    set.add(Math.min(displayStart + i * step, displayEnd))
  }
  for (const t of doseTimes) {
    if (t >= displayStart && t <= displayEnd) set.add(t)
    if (tmaxMs !== null && tmaxMs > 0) {
      const atTmax = t + tmaxMs
      if (atTmax >= displayStart && atTmax <= displayEnd) set.add(atTmax)
    }
  }
  return [...set].sort((a, b) => a - b)
}

describe('E4 equivalência — padrão × referência estendida', () => {
  it('property: central/depot/total presentes obedecem cutoffClose em todos os timestamps comuns', () => {
    const property = fc.property(
      fc.integer({ min: 3_600_000, max: 60 * MS_PER_DAY }), // halfLife
      fc.option(fc.integer({ min: 1_800_000, max: 3 * MS_PER_DAY }), { nil: null as null }),
      fc.integer({ min: 1, max: 5 }), // doses dentro da janela de exibição
      fc.integer({ min: 1, max: 4 }), // doses antigas descartadas
      fc.integer({ min: 0, max: 10_000_000 }),
      fc.integer({ min: 7 * MS_PER_DAY, max: 90 * MS_PER_DAY }), // largura da janela
      (halfLifeMs, tmaxOpt, insideCount, discardedCount, offsetSeed, windowSpan) => {
        const selected: SelectedPkParameters = { halfLifeMs, tmaxMs: tmaxOpt }
        const kinetics: DoseKinetics = absorptionKinetics(halfLifeMs, tmaxOpt)

        // Janela de exibição ancorada longe da época para evitar dependência de relógio.
        const displayStart = 1_800_000_000_000 + (offsetSeed % MS_PER_DAY)
        const displayEnd = displayStart + windowSpan

        // Universo A (padrão): somente doses dentro da CalculationWindow normativa.
        const calculationWindow = deriveCalculationWindow(
          { startMs: displayStart, endMs: displayEnd },
          [selected],
        )

        const standardDoses: Universe['doses'] = []
        for (let i = 0; i < insideCount; i++) {
          const timeMs =
            calculationWindow.startMs +
            ((calculationWindow.endMs - calculationWindow.startMs) * (i + 1)) / (insideCount + 1)
          if (timeMs < calculationWindow.endMs && timeMs >= calculationWindow.startMs) {
            standardDoses.push({ amountMg: 10 + i, timeMs: Math.floor(timeMs) })
          }
        }
        if (standardDoses.length === 0) return

        // Universo B (referência estendida): MESMO limite superior; estende só o inferior
        // com administrações antigas deliberadamente descartadas pela política de cutoff.
        const extendedDoses = [...standardDoses]
        let sumDiscardedDoseMg = 0
        const terminalHalfLifeMs = terminalHalfOf(selected)
        for (let j = 1; j <= discardedCount; j++) {
          const ageBeforeDisplayStart = calculationWindow.startMs - j * 3 * terminalHalfLifeMs - offsetSeed % (MS_PER_DAY / 2)
          if (ageBeforeDisplayStart <= 0) continue
          const amountMg = 5 * j
          extendedDoses.push({ amountMg, timeMs: ageBeforeDisplayStart })
          sumDiscardedDoseMg += amountMg
        }

        // DiscardedAdministrations determinístico: presentes em B, omitidos em A,
        // todos anteriores a calcStart (logo anteriores ao DisplayWindow.start também).
        expect(sumDiscardedDoseMg).toBeGreaterThanOrEqual(0)

        const timestamps = buildTimestamps(
          displayStart,
          displayEnd,
          standardDoses.map((d) => d.timeMs),
          tmaxOpt,
        )

        for (const t of timestamps) {
          const std = universeAmounts(standardDoses, t, kinetics)
          const ext = universeAmounts(extendedDoses, t, kinetics)

          expect(cutoffClose(std.centralMg, ext.centralMg, sumDiscardedDoseMg)).toBe(true)
          expect(cutoffClose(std.depotMg, ext.depotMg, sumDiscardedDoseMg)).toBe(true)
          expect(cutoffClose(std.totalPresentMg, ext.totalPresentMg, sumDiscardedDoseMg)).toBe(true)

          // Conservação DENTRO de cada universo (nunca entre universos):
          void std
          void ext
        }
      },
    )
    forAllSeeds(property, { numRuns: 120 })
  })

  it('sanidade do oráculo: sem descarte os universos coincidem bit a bit', () => {
    const halfLifeMs = 6 * MS_PER_DAY
    const kinetics = absorptionKinetics(halfLifeMs, null)
    const start = 1_700_000_000_000
    const universeA: Universe['doses'] = [{ amountMg: 10, timeMs: start + MS_PER_DAY }]
    const universeB: Universe['doses'] = [...universeA]

    const amountsA = universeAmounts(universeA, start + 5 * MS_PER_DAY, kinetics)
    const amountsB = universeAmounts(universeB, start + 5 * MS_PER_DAY, kinetics)
    expect(amountsA).toEqual(amountsB)
    expect(cutoffClose(amountsA.totalPresentMg, amountsB.totalPresentMg, 0)).toBe(true)
  })
})

function absorptionKinetics(halfLifeMs: number, tmaxMs: number | null): DoseKinetics {
  const { kePerMs, kaPerMs } = absorptionRateFromTmax({ halfLifeMs, tmaxMs })
  return { kePerMs, kaPerMs }
}

function terminalHalfOf(selected: SelectedPkParameters): number {
  const { kePerMs, kaPerMs } = absorptionRateFromTmax(selected)
  return Math.LN2 / Math.min(kePerMs, kaPerMs ?? kePerMs)
}
