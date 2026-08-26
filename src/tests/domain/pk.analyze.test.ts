import { describe, expect, it } from 'vitest'
import { analyze } from '../../domain/pk/analysis'
import {
  CONTRIBUTION_CUTOFF_HALF_LIVES,
  cutoffAgeFor,
} from '../../domain/pk/cutoff'
import { PK_ENGINE_VERSION } from '../../domain/version'

const MS_PER_DAY = 86_400_000
const HALF_LIFE_MS = 6 * MS_PER_DAY

function instantInput(overrides?: Partial<Parameters<typeof analyze>[0]>): Parameters<typeof analyze>[0] {
  return {
    halfLifeMs: HALF_LIFE_MS,
    tmaxMs: null,
    doses: [{ id: 'd1', amountMg: 10, timeMs: 0 }],
    nowMs: 0,
    ...overrides,
  }
}

describe('analyze — metadata e horizonte', () => {
  it('metadata completa com versão própria do PK Engine', () => {
    const output = analyze(instantInput())
    expect(output.metadata.pkEngineVersion).toBe(PK_ENGINE_VERSION)
    expect(output.metadata.contributionCutoffHalfLives).toBe(CONTRIBUTION_CUTOFF_HALF_LIVES)
    expect(output.metadata.contributionCutoffAgeMs).toBe(cutoffAgeFor({ halfLifeMs: HALF_LIFE_MS, tmaxMs: null }))
    expect(output.metadata.kaPerMs).toBeNull()
    expect(Number.isFinite(output.metadata.kePerMs)).toBe(true)
    expect(output.metadata.analysisCurveSteps).toBe(1600)
  })

  it('horizonte = última dose + max(10,5·T½term, 2·Tmax_eff, 2·T½)', () => {
    const output = analyze(instantInput())
    expect(output.metadata.horizonEndMs).toBe(0 + Math.max(10.5 * HALF_LIFE_MS, 0, 2 * HALF_LIFE_MS))

    const finiteOutput = analyze({
      halfLifeMs: HALF_LIFE_MS,
      tmaxMs: 2 * MS_PER_DAY,
      doses: [{ id: 'a', amountMg: 5, timeMs: MS_PER_DAY }],
      nowMs: MS_PER_DAY,
    })
    // T½term=min(ke,ka); apenas verificamos coerência estrutural aqui
    expect(finiteOutput.metadata.horizonEndMs).toBeGreaterThan(MS_PER_DAY)
    expect(Number.isFinite(finiteOutput.metadata.terminalHalfLifeMs)).toBe(true)
  })

  it('curva de análise cobre grade + pontos críticos, sem alinhamento por índice', () => {
    const output = analyze(instantInput())
    expect(output.analysisCurve.length).toBeGreaterThanOrEqual(1601)
    expect(output.analysisCurve[0]!.timeMs).toBe(0)
    const times = output.analysisCurve.map((p) => p.timeMs)
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!).toBeGreaterThan(times[i - 1]!)
    }
  })
})

describe('analyze — pico e marcos', () => {
  it('pico válido dentro do domínio', () => {
    const output = analyze(instantInput())
    expect(output.peak.amountMg).toBeGreaterThan(0)
    expect(output.peak.timeMs).toBeGreaterThanOrEqual(0)
    expect(output.peak.timeMs).toBeLessThanOrEqual(output.metadata.horizonEndMs)
  })

  it('pico de dose instantânea coincide com a dose (varredura+ternária)', () => {
    const output = analyze(instantInput())
    expect(output.peak.amountMg).toBeCloseTo(10, 6)
    expect(Math.abs(output.peak.timeMs)).toBeLessThan(60_000)
  })

  it('marcos ordenados quando alcançados e coerentes com o pico', () => {
    const output = analyze(instantInput())
    expect(output.milestones.map((m) => m.percentage)).toEqual([50, 25, 12.5, 10, 5, 1, 0.1])
    let previous: number | null = null
    for (const milestone of output.milestones) {
      if (milestone.timeMs === null) continue
      expect(milestone.targetMg).toBeLessThanOrEqual(output.peak.amountMg)
      expect(milestone.timeMs).toBeGreaterThanOrEqual(output.peak.timeMs - 60_000)
      if (previous !== null) {
        expect(milestone.timeMs).toBeGreaterThanOrEqual(previous)
      }
      previous = milestone.timeMs
    }
    expect(previous).not.toBeNull()
  })

  it('flip-flop longo: horizonte termina antes de cruzar 0,1% ⇒ MILESTONE_NOT_REACHED', () => {
    // T½=1 h (ke rápido); Tmax=ln(4/3)/(0,25·ke) ⇒ ka=0,75·ke (T½term≈1,333 h).
    // Halvings pós-pico ≈ (14 h − 1,66 h)/1,333 h ≈ 9,26 < 10 ⇒ 0,1% (2^-10) inatingível;
    // 0,5% (≈7,64 halvings) e acima permanecem alcançados.
    const halfLifeMs = 3_600_000
    const kePerMs = Math.LN2 / halfLifeMs
    const tmaxMs = Math.round(Math.log(4 / 3) / (0.25 * kePerMs))
    const output = analyze({
      halfLifeMs,
      tmaxMs,
      doses: [{ id: 'd', amountMg: 10, timeMs: 0 }],
      nowMs: 0,
    })
    expect(output.warnings).toContain('FLIP_FLOP_ABSORPTION')

    const byPct = new Map(output.milestones.map((m) => [m.percentage, m]))
    expect(byPct.get(50)!.timeMs).not.toBeNull()
    expect(byPct.get(1)!.timeMs).not.toBeNull()
    expect(byPct.get(0.1)!.timeMs).toBeNull()
  })

  it('warnings de absorção: flip-flop e near-degenerate separados do algoritmo', () => {
    const flipFlop = analyze({
      halfLifeMs: HALF_LIFE_MS,
      tmaxMs: 12 * MS_PER_DAY,
      doses: [{ id: 'd', amountMg: 5, timeMs: 0 }],
      nowMs: 0,
    })
    expect(flipFlop.warnings).toContain('FLIP_FLOP_ABSORPTION')

    const critical = HALF_LIFE_MS / Math.LN2
    const nearDegenerate = analyze({
      halfLifeMs: HALF_LIFE_MS,
      tmaxMs: critical * (1 + 1e-12),
      doses: [{ id: 'd', amountMg: 5, timeMs: 0 }],
      nowMs: 0,
    })
    expect(nearDegenerate.warnings).toContain('NEAR_DEGENERATE_RATES')
    expect(Number.isFinite(nearDegenerate.peak.amountMg)).toBe(true)

    const instant = analyze(instantInput())
    expect(instant.warnings).toEqual([])
  })
})

describe('analyze — validações e administrações', () => {
  it('administrações mapeiam todas as doses ordenadas', () => {
    const output = analyze({
      halfLifeMs: HALF_LIFE_MS,
      tmaxMs: null,
      doses: [
        { id: 'b', amountMg: 5, timeMs: 2 * MS_PER_DAY },
        { id: 'a', amountMg: 10, timeMs: 0 },
      ],
      nowMs: 2 * MS_PER_DAY,
    })
    expect(output.administrations.map((a) => a.doseId)).toEqual(['a', 'b'])
    expect(output.currentState.plannedCount).toBe(0)
  })

  it.each([
    [[], 'NO_DOSES'],
  ] as const)('validação base', (doses, code) => {
    expect.assertions(1)
    try {
      analyze({ halfLifeMs: HALF_LIFE_MS, tmaxMs: null, doses: [...doses], nowMs: 0 })
    } catch (error) {
      expect((error as { code?: string }).code).toBe(code)
    }
  })

  it.each([0, -3, Number.NaN, 1_000_001])('amount inválido %s ⇒ INVALID_DOSE_AMOUNT', (amount) => {
    expect(() =>
      analyze({ halfLifeMs: HALF_LIFE_MS, tmaxMs: null, doses: [{ id: 'd', amountMg: amount, timeMs: 0 }], nowMs: 0 }),
    ).toThrowError()
  })

  it('timeMs não finito ⇒ INVALID_DOSE_TIME; steps inválidos ⇒ INVALID_HORIZON', () => {
    expect(() =>
      analyze({ halfLifeMs: HALF_LIFE_MS, tmaxMs: null, doses: [{ id: 'd', amountMg: 5, timeMs: Number.NaN }], nowMs: 0 }),
    ).toThrowError()
    expect(() => analyze(instantInput({ analysisCurveSteps: 0 }))).toThrowError()
  })
})
