import { describe, expect, it } from 'vitest'
import { stateAt, terminalRate } from '../../domain/pk/state'
import { conservationClose } from '../../domain/shared/tolerances'

const MS_PER_DAY = 86_400_000
const HALF_LIFE_MS = 6 * MS_PER_DAY
const KINETIC = { halfLifeMs: HALF_LIFE_MS, tmaxMs: null }

describe('estado por dose — superposição linear', () => {
  const doses = [{ id: 'd1', amountMg: 100, timeMs: 0 }]

  it('dose única instantânea no instante da dose', () => {
    const state = stateAt(doses, 0, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    expect(state.administeredMg).toBe(100)
    expect(state.administeredCount).toBe(1)
    expect(state.plannedCount).toBe(0)
    expect(state.centralMg).toBe(100)
    expect(state.depotMg).toBe(0)
    expect(state.eliminatedMg).toBe(0)
    expect(state.centralPercent).toBe(1)
  })

  it('após 1 T½ ⇒ ≈50% central, resto eliminado, conservação fecha', () => {
    const state = stateAt(doses, HALF_LIFE_MS, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    expect(state.centralMg).toBeCloseTo(50, 9)
    expect(state.eliminatedMg).toBeCloseTo(50, 9)
    expect(
      conservationClose(
        state.administeredMg,
        state.centralMg + state.depotMg + state.eliminatedMg,
      ),
    ).toBe(true)
    expect(state.centralPercent).toBeCloseTo(0.5, 9)
    expect(state.eliminatedPercent).toBeCloseTo(0.5, 9)
  })

  it('dose futura NÃO entra no estado atual (plannedCount correto)', () => {
    const withFuture = [
      { id: 'a', amountMg: 100, timeMs: 1_000 },
      { id: 'b', amountMg: 50, timeMs: 1_000_000 },
    ]
    const state = stateAt(withFuture, 1_000, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    expect(state.administeredCount).toBe(1)
    expect(state.plannedCount).toBe(1)
    expect(state.administeredMg).toBe(100)
  })

  it('estado anterior à primeira dose ⇒ tudo zero sem NaN', () => {
    const state = stateAt(doses, -60_000, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    expect(state.administeredCount).toBe(0)
    expect(state.plannedCount).toBe(1)
    expect(state.administeredMg).toBe(0)
    expect(state.centralPercent).toBe(0)
    expect(state.depotPercent).toBe(0)
    expect(state.eliminatedPercent).toBe(0)
  })

  it('duas doses superpõem linearmente (soma das contribuições individuais)', () => {
    const pair = [
      { id: 'x', amountMg: 100, timeMs: 0 },
      { id: 'y', amountMg: 40, timeMs: 2 * MS_PER_DAY },
    ]
    const t = 5 * MS_PER_DAY
    const combined = stateAt(pair, t, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    const aloneX = stateAt([pair[0]!], t, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    const aloneY = stateAt([pair[1]!], t, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    expect(combined.centralMg).toBeCloseTo(aloneX.centralMg + aloneY.centralMg, 6)
    expect(combined.depotMg).toBeCloseTo(aloneX.depotMg + aloneY.depotMg, 9)
    expect(combined.administeredMg).toBe(140)
  })

  it('entrada inválida de dose rejeitada pelo motor (defesa)', () => {
    let code = ''
    try {
      stateAt([{ id: 'bad', amountMg: 0, timeMs: 0 }], 0, KINETIC.halfLifeMs, KINETIC.tmaxMs)
    } catch (error) {
      code = (error as { code?: string }).code ?? ''
    }
    expect(code).toBe('INVALID_DOSE_AMOUNT')
  })

  it('taxa terminal: instantânea ⇒ ke; finita flip-flop ⇒ min(ke,ka)', () => {
    expect(terminalRate({ kePerMs: 2e-9, kaPerMs: null })).toBe(2e-9)
    expect(terminalRate({ kePerMs: 2e-9, kaPerMs: 1e-9 })).toBe(1e-9)
    expect(terminalRate({ kePerMs: 1e-9, kaPerMs: 3e-9 })).toBe(1e-9)
  })
})
