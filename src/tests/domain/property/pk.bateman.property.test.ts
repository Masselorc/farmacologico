import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { depotFromDose, phi, stableBatemanAmount } from '../../../domain/pk/bateman'
import { absorptionRateFromTmax, eliminationRate } from '../../../domain/pk/rates'
import { NEAR_DEGENERATE_RATES_REL } from '../../../domain/shared/tolerances'
import { amountClose } from '../../../domain/shared/tolerances'
import {
  decimalOracleCentral,
  decimalOracleDepot,
  forAllSeeds,
} from './helpers'

const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

describe('E4 Bateman — matriz degenerada obrigatória vs oráculo Decimal (60 dígitos)', () => {
  const ratios = [1 - 1e-12, 1 + 1e-12, 1 - 1e-10, 1 + 1e-10, 1 - 1e-8, 1 + 1e-8, 1 - 1e-6, 1 + 1e-6]
  const times = [
    0,
    1,
    MS_PER_HOUR / 2, // muito pequeno
    2 * MS_PER_HOUR, // antes de Tmax típico
    6 * MS_PER_HOUR, // próximo de Tmax
    12 * MS_PER_HOUR, // em torno de Tmax
    48 * MS_PER_HOUR,
    30 * MS_PER_DAY, // cauda longa
  ]
  const doses = [1e-9, 1, 1e6]

  it('matriz completa ratio ka/ke × tempos × doses: acumula maxRelativeError e verifica bound', () => {
    const halfLifeMs = 48 * MS_PER_HOUR
    const ke = eliminationRate(halfLifeMs)
    let maxRelativeError = 0

    for (const ratio of ratios) {
      const ka = ke * ratio
      const kinetics = { kePerMs: ke, kaPerMs: ka }

      for (const dose of doses) {
        for (const dt of times) {
          const gotCentral = stableBatemanAmount(dose, dt, kinetics)
          const expectedCentral = decimalOracleCentral(dose, dt, ke, ka)
          expect(Number.isFinite(gotCentral)).toBe(true)
          if (expectedCentral === 0) {
            expect(gotCentral).toBe(0)
          } else {
            const relErr = Math.abs(gotCentral - expectedCentral) / expectedCentral
            if (relErr > maxRelativeError) maxRelativeError = relErr
            expect(relErr).toBeLessThanOrEqual(1e-11)
          }
          expect(amountClose(gotCentral, expectedCentral)).toBe(true)

          const gotDepot = depotFromDose(dose, dt, kinetics)
          const expectedDepot = decimalOracleDepot(dose, dt, ka)
          if (expectedDepot === 0) {
            expect(gotDepot).toBe(0)
          } else {
            const relErrDepot = Math.abs(gotDepot - expectedDepot) / expectedDepot
            if (relErrDepot > maxRelativeError) maxRelativeError = relErrDepot
            expect(relErrDepot).toBeLessThanOrEqual(1e-11)
          }
        }
      }
    }

    expect(maxRelativeError).toBeLessThanOrEqual(1e-11)
    console.info(`[e4-bateman] maxRelativeError=${maxRelativeError.toExponential(16)}`)
  })

  it.each(ratios.map((r) => [r as number]))('ratio ka/ke=%e: motor ≡ oráculo em todos os tempos/doses', (ratio) => {
    const halfLifeMs = 48 * MS_PER_HOUR
    const ke = eliminationRate(halfLifeMs)
    const ka = ke * ratio
    const kinetics = { kePerMs: ke, kaPerMs: ka }

    for (const dose of doses) {
      for (const dt of times) {
        const gotCentral = stableBatemanAmount(dose, dt, kinetics)
        const expectedCentral = decimalOracleCentral(dose, dt, ke, ka)
        expect(Number.isFinite(gotCentral)).toBe(true)
        if (expectedCentral === 0) {
          expect(gotCentral).toBe(0)
        } else {
          // Erro relativo do double contra referência de 60 dígitos deve ser minúsculo.
          expect(Math.abs(gotCentral - expectedCentral) / expectedCentral).toBeLessThanOrEqual(1e-11)
        }
        expect(amountClose(gotCentral, expectedCentral)).toBe(true)

        const gotDepot = depotFromDose(dose, dt, kinetics)
        const expectedDepot = decimalOracleDepot(dose, dt, ka)
        if (expectedDepot === 0) {
          expect(gotDepot).toBe(0)
        } else {
          expect(Math.abs(gotDepot - expectedDepot) / expectedDepot).toBeLessThanOrEqual(1e-11)
        }
      }
    }
  })

  it('ratio exatamente 1 usa a forma estável e coincide com o limite analítico', () => {
    const k = eliminationRate(48 * MS_PER_HOUR)
    const kinetics = { kePerMs: k, kaPerMs: k }
    for (const dt of times) {
      for (const dose of doses) {
        const got = stableBatemanAmount(dose, dt, kinetics)
        const limit = dose * k * dt * Math.exp(-k * dt)
        expect(amountClose(got, limit)).toBe(true)
      }
    }
  })
})

describe('E4 Bateman — continuidade bilateral em ka→ke (sem salto físico em 1e-8)', () => {
  it('ε decrescendo converge para o valor degenerado; fronteira do warning não muda o cálculo', () => {
    const halfLifeMs = 24 * MS_PER_HOUR
    const k = eliminationRate(halfLifeMs)
    const dt = 10 * MS_PER_HOUR
    const center = stableBatemanAmount(100, dt, { kePerMs: k, kaPerMs: k })

    for (const eps of [1e-6, 1e-8 + 1e-12, 1e-8, 1e-8 - 1e-12, 1e-10, 1e-12]) {
      const up = stableBatemanAmount(100, dt, { kePerMs: k, kaPerMs: k * (1 + eps) })
      const down = stableBatemanAmount(100, dt, { kePerMs: k, kaPerMs: k * (1 - eps) })
      // Continuidade física: a diferença deve ser proporcional a ε; para
      // ε=1e-6 amountClose não é o critério correto de comparação.
      expect(Math.abs(up - center) / Math.max(center, 1e-300)).toBeLessThanOrEqual(10 * eps + 1e-12)
      expect(Math.abs(down - center) / Math.max(center, 1e-300)).toBeLessThanOrEqual(10 * eps + 1e-12)
      expect(NEAR_DEGENERATE_RATES_REL).toBe(1e-8)
    }
  })

  it('property: |f(ke·(1±ε)) − f(ke)| ≤ f(ke)·C·ε com C pequeno para ε ∈ [1e-15, 1e-4]', () => {
    const property = fc.property(
      fc.integer({ min: 3_600_000, max: 90 * 86_400_000 }),
      fc.integer({ min: 60_000, max: 200 * 3_600_000 }),
      fc.double({ min: Math.log(1e-15), max: Math.log(1e-4), noNaN: true }),
      (halfLifeMs, dtRaw, logEps) => {
        const k = eliminationRate(halfLifeMs)
        const eps = Math.exp(logEps)
        const dt = Math.min(dtRaw, halfLifeMs * 2)
        const center = stableBatemanAmount(100, dt, { kePerMs: k, kaPerMs: k })
        const up = stableBatemanAmount(100, dt, { kePerMs: k, kaPerMs: k * (1 + eps) })
        const deviation = Math.abs(up - center)
        // Sensibilidade de primeira ordem: desvio ≤ ~dt·k·ε·valor escala suavemente.
      expect(deviation / Math.max(center, 1e-300)).toBeLessThanOrEqual(2 * eps + 1e-12)
      },
    )
    forAllSeeds(property, { numRuns: 300 })
  })
})

describe('E4 Bateman — propriedades físicas por geração aleatória', () => {
  it('central/depot ≥0, ≤dose; Δt<0 ⇒ 0; instantânea ⇒ depot≡0; finita t=0 ⇒ central=0, depot=dose', () => {
    const property = fc.property(
      fc.integer({ min: 60_000, max: 3650 * 86_400_000 }),
      fc.option(fc.integer({ min: 60_000, max: 180 * 86_400_000 }), { nil: null as null }),
      fc.double({ min: 1e-9, max: 1e6, noNaN: true }),
      fc.integer({ min: -86_400_000, max: 365 * 86_400_000 }),
      (halfLifeMs, tmaxOpt, dose, deltaRaw) => {
        const { kePerMs, kaPerMs } = safeKinetics(halfLifeMs, tmaxOpt)
        const kinetics = { kePerMs, kaPerMs }
        const dt = deltaRaw

        if (dt < 0) {
          expect(stableBatemanAmount(dose, dt, kinetics)).toBe(0)
          expect(depotFromDose(dose, dt, kinetics)).toBe(0)
          return
        }

        const central = stableBatemanAmount(dose, dt, kinetics)
        const depot = depotFromDose(dose, dt, kinetics)
        expect(Number.isFinite(central)).toBe(true)
        expect(Number.isFinite(depot)).toBe(true)
        expect(central).toBeGreaterThanOrEqual(0)
        expect(depot).toBeGreaterThanOrEqual(0)
        expect(central).toBeLessThanOrEqual(dose)
        expect(depot).toBeLessThanOrEqual(dose)

        if (kaPerMs === null) {
          expect(depot).toBe(0)
        }
        if (kaPerMs !== null && dt === 0) {
          expect(central).toBe(0)
          expect(depot).toBe(dose)
        }

        // Oráculo de precisão ampliada sempre que o resultado é positivo representável.
        if (central > 0) {
          const oracleCentral = decimalOracleCentral(dose, dt, kePerMs, kaPerMs)
          expect(amountClose(central, oracleCentral)).toBe(true)
        }
        if (depot > 0) {
          expect(amountClose(depot, decimalOracleDepot(dose, dt, kaPerMs))).toBe(true)
        }
      },
    )
    forAllSeeds(property, { numRuns: 500 })
  })

  it('phi(z) contínuo em z=0 e positivo para z≥0', () => {
    expect(phi(0)).toBe(1)
    const property = fc.property(fc.float({ min: 0, max: 700, noNaN: true }), (z) => {
      const value = phi(z)
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThan(0)
    })
    forAllSeeds(property, { numRuns: 200 })
  })
})

function safeKinetics(halfLifeMs: number, tmaxMs: number | null): { kePerMs: number; kaPerMs: number | null } {
  const ke = eliminationRate(halfLifeMs)
  if (tmaxMs === null || tmaxMs === 0) return { kePerMs: ke, kaPerMs: null }
  // Mantém apenas pares representáveis; casos extremos são cobertos na suíte de extremos.
  const critical = halfLifeMs / Math.LN2
  if (tmaxMs > critical * 1e6) {
    return { kePerMs: ke, kaPerMs: null }
  }
  try {
    const { kaPerMs } = absorptionRateFromTmax({ halfLifeMs, tmaxMs })
    return { kePerMs: ke, kaPerMs }
  } catch {
    return { kePerMs: ke, kaPerMs: null }
  }
}
