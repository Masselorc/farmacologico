import { describe, expect, it } from 'vitest'
import {
  absorptionRateFromTmax,
  eliminationRate,
  tmaxForEqualRates,
} from '../../domain/pk/rates'
import { domainError } from '../../domain/shared/errors'

const MS_PER_DAY = 86_400_000
const HALF_LIFE_6D_MS = 6 * MS_PER_DAY

describe('eliminationRate', () => {
  it('meia-vida válida produz ke finite>0 sem arredondamento', () => {
    const ke = eliminationRate(HALF_LIFE_6D_MS)
    expect(Number.isFinite(ke)).toBe(true)
    expect(ke).toBeGreaterThan(0)
    expect(ke).toBe(Math.LN2 / HALF_LIFE_6D_MS)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('halfLife %s rejeitada com HALF_LIFE_NON_POSITIVE', (bad) => {
    try {
      eliminationRate(bad)
      throw new Error('deveria lançar')
    } catch (error) {
      expect((error as ReturnType<typeof domainError>).code).toBe('HALF_LIFE_NON_POSITIVE')
    }
  })
})

describe('solver de absorção — âncoras normativas (rtol 1e-4)', () => {
  it('T½ 6 d / Tmax 2 d ⇒ ka ≈ 1,34159 dia⁻¹ (ka > ke)', () => {
    const { kaPerMs } = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: 2 * MS_PER_DAY })
    expect(kaPerMs).not.toBeNull()
    const kaPerDay = kaPerMs! * MS_PER_DAY
    expect(Math.abs(kaPerDay - 1.34159) / 1.34159).toBeLessThanOrEqual(1e-4)
    expect(kaPerDay).toBeGreaterThan(eliminationRate(HALF_LIFE_6D_MS) * MS_PER_DAY)
  })

  it('Tmax 4,649224 d ⇒ ka ≈ 0,36 dia⁻¹ (ainda ka > ke pois 4,65 < T½/ln2)', () => {
    const { kaPerMs } = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: 4.649224 * MS_PER_DAY })
    expect(kaPerMs).not.toBeNull()
    const kaPerDay = kaPerMs! * MS_PER_DAY
    expect(Math.abs(kaPerDay - 0.36) / 0.36).toBeLessThanOrEqual(1e-4)
    const kePerDay = eliminationRate(HALF_LIFE_6D_MS) * MS_PER_DAY
    expect(kaPerDay).toBeGreaterThan(kePerDay)
    expect(4.649224).toBeLessThan(6 / Math.LN2)
  })

  it('flip-flop real: Tmax > T½/ln2 ⇒ ka < ke', () => {
    const { kaPerMs } = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: 12 * MS_PER_DAY })
    const kePerDay = eliminationRate(HALF_LIFE_6D_MS) * MS_PER_DAY
    expect(kaPerMs! * MS_PER_DAY).toBeLessThan(kePerDay)
  })
})

describe('casos de borda do solver', () => {
  it('Tmax null ou 0 ⇒ ka=null (absorção instantânea)', () => {
    expect(absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: null }).kaPerMs).toBeNull()
    expect(absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: 0 }).kaPerMs).toBeNull()
  })

  it('Tmax negativo ⇒ TMAX_NEGATIVE; não finito ⇒ TMAX_NEGATIVE', () => {
    for (const tmax of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      let code = ''
      try {
        absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: tmax })
      } catch (error) {
        code = (error as ReturnType<typeof domainError>).code ?? (error as Error).message
      }
      if (tmax === Number.POSITIVE_INFINITY) {
        expect(['TMAX_NEGATIVE', 'ABSORPTION_SOLVER_FAILURE']).toContain(code)
      } else {
        expect(code).toBe('TMAX_NEGATIVE')
      }
    }
  })

  it('Tmax crítico T½/ln2 ⇒ ka = ke exatamente', () => {
    const critical = tmaxForEqualRates(HALF_LIFE_6D_MS)
    const { kePerMs, kaPerMs } = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: critical })
    expect(kaPerMs).toBe(kePerMs)
  })

  it('pós-condição: Tmax representável mas ka não representável ⇒ ABSORPTION_SOLVER_FAILURE', () => {
    let code = ''
    try {
      absorptionRateFromTmax({ halfLifeMs: 1, tmaxMs: MS_PER_DAY })
    } catch (error) {
      code = (error as ReturnType<typeof domainError>).code
    }
    expect(code).toBe('ABSORPTION_SOLVER_FAILURE')
  })

  it('vizinhança de ka=ke não apresenta salto (continuidade do solver)', () => {
    const critical = tmaxForEqualRates(HALF_LIFE_6D_MS)
    const eps = critical * 1e-9
    const below = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: critical - eps }).kaPerMs!
    const equal = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: critical }).kaPerMs!
    const above = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_6D_MS, tmaxMs: critical + eps }).kaPerMs!
    expect(below).toBeGreaterThanOrEqual(equal)
    expect(equal).toBeGreaterThanOrEqual(above)
    expect(below - above).toBeLessThan(equal * 1e-6)
  })
})
