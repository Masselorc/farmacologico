import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { absorptionRateFromTmax, eliminationRate, tmaxForEqualRates } from '../../../domain/pk/rates'
import { domainError } from '../../../domain/shared/errors'
import { RATES_RTOL, TMAX_RECOMPOSITION_RTOL } from '../../../domain/shared/tolerances'
import { E4_SEEDS, oracleG, forAllSeeds } from './helpers'

const MS_PER_DAY = 86_400_000
const HALF_LIFE_6D = 6 * MS_PER_DAY

describe('E4 solver — identidade pela equação em espaço-y (oráculo independente)', () => {
  const halfLifeArb = fc.integer({ min: 60_000, max: 3650 * MS_PER_DAY })
  // Tmax log-uniforme cobrindo regiões ka>ke / ka≈ke / ka<ke representáveis.
  const tmaxArb = fc.oneof(
    fc.double({ min: 1, max: 3_600_000, noNaN: true }), // muito pequeno (ka>>ke)
    fc.integer({ min: 3_600_000, max: 3650 * MS_PER_DAY }),
  )

  const property = fc.property(halfLifeArb, tmaxArb, (halfLifeMs, tmaxMs) => {
    let kaPerMs: number | null
    try {
      kaPerMs = absorptionRateFromTmax({ halfLifeMs, tmaxMs }).kaPerMs
    } catch (error) {
      // Falha normativa aceitável apenas como ABSORPTION_SOLVER_FAILURE; nunca ka=0.
      const code = (error as ReturnType<typeof domainError>).code
      expect(code).toBe('ABSORPTION_SOLVER_FAILURE')
      return
    }
    expect(kaPerMs).not.toBeNull()
    expect(Number.isFinite(kaPerMs!)).toBe(true)
    expect(kaPerMs!).toBeGreaterThan(0)

    // Recomposição: y = ln(ka) - ln(ke); g(y) deve reproduzir c = ke·Tmax dentro de TMAX_RECOMPOSITION_RTOL.
    const ke = eliminationRate(halfLifeMs)
    const y = Math.log(kaPerMs!) - Math.log(ke)
    const cTarget = ke * tmaxMs
    const cAchieved = oracleG(y)
    const relativeResidual = Math.abs(cAchieved - cTarget) / cTarget
    expect(relativeResidual).toBeLessThanOrEqual(TMAX_RECOMPOSITION_RTOL)
  })

  it('recompõe Tmax para o domínio representável (multi-seed)', () => {
    forAllSeeds(property, { numRuns: 400 })
  })

  it(`seeds canônicas ${E4_SEEDS.join(', ')} exercitam a mesma property`, () => {
    expect(E4_SEEDS.length).toBeGreaterThanOrEqual(4)
  })
})

describe('E4 solver — regiões através de Tcrit = T½/ln2', () => {
  const critical = tmaxForEqualRates(HALF_LIFE_6D)

  function kaOf(tmaxMs: number): number {
    return absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D, tmaxMs }).kaPerMs!
  }

  it('Tmax < Tcrit ⇒ ka > ke; Tcrit ⇒ ka=ke; Tmax > Tcrit ⇒ ka < ke', () => {
    const ke = eliminationRate(HALF_LIFE_6D)
    for (const factor of [0.01, 0.1, 0.5, 0.9]) {
      expect(kaOf(critical * factor)).toBeGreaterThan(ke)
    }
    expect(kaOf(critical)).toBeCloseTo(ke, 20)
    for (const factor of [1.1, 2, 10]) {
      expect(kaOf(critical * factor)).toBeLessThan(ke)
    }
  })

  it('monotonicidade: Tmax crescente ⇒ ka estritamente decrescente', () => {
    const samples = [0.001, 0.01, 0.1, 0.5, 1, 1.0000001, 1.001, 1.1, 2, 10].map((f) => ({
      tmax: critical * f,
      ka: kaOf(critical * f),
    }))
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!.ka).toBeLessThan(samples[i - 1]!.ka)
    }
  })
})

describe('E4 solver — âncoras normativas e extremos', () => {
  it('6 d / 2 d ⇒ ka≈1,34159/dia; inversa 4,649224 d ⇒ ka≈0,36/dia', () => {
    const anchorA = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D, tmaxMs: 2 * MS_PER_DAY }).kaPerMs!
    expect(Math.abs(anchorA * MS_PER_DAY - 1.34159) / 1.34159).toBeLessThanOrEqual(1e-4)

    const anchorB = absorptionRateFromTmax({
      halfLifeMs: HALF_LIFE_6D,
      tmaxMs: 4.649224 * MS_PER_DAY,
    }).kaPerMs!
    expect(Math.abs(anchorB * MS_PER_DAY - 0.36) / 0.36).toBeLessThanOrEqual(1e-4)
  })

  it('extremo normativo: halfLife=1 ms com Tmax=3650 d ⇒ ABSORPTION_SOLVER_FAILURE, NUNCA ka=0', () => {
    expect.assertions(2)
    try {
      absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: 3650 * MS_PER_DAY })
    } catch (error) {
      expect((error as ReturnType<typeof domainError>).code).toBe('ABSORPTION_SOLVER_FAILURE')
      expect((error as { params?: Record<string, number | string> }).params?.c).toBeDefined()
    }
  })

  it('extremo muito pequeno, porém NORMAL representável: halfLife=1 ms com Tmax=1000 ms', () => {
    // c ≈ 693.147 ⇒ y ≈ −697.75 ⇒ ka ≈ 6.47e-302 / ms (normal, pois >= 2^-1022 ≈ 2.225e-308)
    const MIN_NORMAL_DOUBLE = 2 ** -1022
    const result = absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: 1000 })
    expect(result.kaPerMs).not.toBeNull()
    expect(Number.isFinite(result.kaPerMs!)).toBe(true)
    expect(result.kaPerMs!).toBeGreaterThan(0)
    expect(result.kaPerMs!).toBeGreaterThanOrEqual(MIN_NORMAL_DOUBLE)

    const ke = eliminationRate(1)
    const y = Math.log(result.kaPerMs!) - Math.log(ke)
    const cTarget = ke * 1000
    const cAchieved = oracleG(y)
    const relativeResidual = Math.abs(cAchieved - cTarget) / cTarget
    expect(relativeResidual).toBeLessThanOrEqual(TMAX_RECOMPOSITION_RTOL)
  })

  it('extremo SUBNORMAL positivo representável: halfLife=1 ms com Tmax=1025 ms', () => {
    // c ≈ 710.476 ⇒ y ≈ −710.476 ⇒ ka ≈ 1.93e-309 / ms (subnormal, pois 0 < ka < 2^-1022)
    const MIN_NORMAL_DOUBLE = 2 ** -1022
    const result = absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: 1025 })
    expect(result.kaPerMs).not.toBeNull()
    expect(Number.isFinite(result.kaPerMs!)).toBe(true)
    expect(result.kaPerMs!).toBeGreaterThan(0)
    expect(result.kaPerMs!).toBeLessThan(MIN_NORMAL_DOUBLE)
    expect(result.kaPerMs!).toBeGreaterThanOrEqual(Number.MIN_VALUE)

    const ke = eliminationRate(1)
    const y = Math.log(result.kaPerMs!) - Math.log(ke)
    const cTarget = ke * 1025
    const cAchieved = oracleG(y)
    const relativeResidual = Math.abs(cAchieved - cTarget) / cTarget
    expect(relativeResidual).toBeLessThanOrEqual(TMAX_RECOMPOSITION_RTOL)
  })

  it('classificação IEEE-754 explícita: 1000 ms (normal) vs 1025 ms (subnormal) vs 3650 d (não representável)', () => {
    const minNormal = 2 ** -1022

    const ka1000 = absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: 1000 }).kaPerMs!
    const ka1025 = absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: 1025 }).kaPerMs!

    // ka1000 é NORMAL
    expect(ka1000).toBeGreaterThanOrEqual(minNormal)
    expect(Number.isFinite(ka1000)).toBe(true)

    // ka1025 é SUBNORMAL positivo
    expect(ka1025).toBeGreaterThan(0)
    expect(ka1025).toBeLessThan(minNormal)
    expect(ka1025).toBeGreaterThanOrEqual(Number.MIN_VALUE)

    // Ambos recompõem a equação dentro de TMAX_RECOMPOSITION_RTOL
    const ke = eliminationRate(1)
    for (const [ka, tmaxMs] of [
      [ka1000, 1000],
      [ka1025, 1025],
    ] as const) {
      const y = Math.log(ka) - Math.log(ke)
      const cTarget = ke * tmaxMs
      const cAchieved = oracleG(y)
      const relativeResidual = Math.abs(cAchieved - cTarget) / cTarget
      expect(relativeResidual).toBeLessThanOrEqual(TMAX_RECOMPOSITION_RTOL)
    }

    // 3650 d é não representável ⇒ ABSORPTION_SOLVER_FAILURE
    expect(() => absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: 3650 * MS_PER_DAY })).toThrowError(
      expect.objectContaining({ code: 'ABSORPTION_SOLVER_FAILURE' }),
    )
  })

  it('property de pós-condição: nunca existe solução aceita com ka ≤ 0 ou não finito', () => {
    const property = fc.property(
      fc.integer({ min: 1, max: 86_400_000 }),
      fc.integer({ min: 1, max: 31_536_000_000 }),
      (halfLifeMs, tmaxMs) => {
        try {
          const { kaPerMs } = absorptionRateFromTmax({ halfLifeMs, tmaxMs })
          if (kaPerMs === null) return
          expect(Number.isFinite(kaPerMs)).toBe(true)
          expect(kaPerMs).toBeGreaterThan(0)
        } catch (error) {
          expect((error as ReturnType<typeof domainError>).code).toBe('ABSORPTION_SOLVER_FAILURE')
        }
      },
    )
    forAllSeeds(property, { numRuns: 300 })
  })

  it('RATES_RTOL permanece normativo e usado na vizinhança crítica', () => {
    expect(RATES_RTOL).toBe(1e-10)
    const critical = tmaxForEqualRates(HALF_LIFE_6D)
    const ke = eliminationRate(HALF_LIFE_6D)
    const eps = critical * 1e-11 // bem dentro da região near-degenerate
    const below = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D, tmaxMs: critical - eps }).kaPerMs!
    expect(Math.abs(below - ke) / ke).toBeLessThanOrEqual(RATES_RTOL * 100)
  })
})
