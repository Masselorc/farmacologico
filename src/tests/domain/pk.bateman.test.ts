import { describe, expect, it } from 'vitest'
import {
  contributionFromDose,
  depotFromDose,
  phi,
  stableBatemanAmount,
} from '../../domain/pk/bateman'
import { eliminationRate } from '../../domain/pk/rates'
import { amountClose } from '../../domain/shared/tolerances'

const MS_PER_HOUR = 3_600_000
const HALF_LIFE_MS = 48 * MS_PER_HOUR

describe('phi(z)', () => {
  it('extensão contínua phi(0)=1', () => {
    expect(phi(0)).toBe(1)
  })

  it('valores finitos e coerentes (phi pequeno ≈1, decresce depois)', () => {
    expect(Math.abs(phi(1e-12) - 1)).toBeLessThan(1e-11)
    expect(phi(10)).toBeGreaterThan(0)
    expect(Number.isFinite(phi(700))).toBe(true)
  })
})

describe('Bateman estável — absorção instantânea', () => {
  const kinetics = { kePerMs: eliminationRate(HALF_LIFE_MS), kaPerMs: null }

  it('Δt<0 ⇒ 0 (antes da dose não há contribuição)', () => {
    expect(stableBatemanAmount(100, -1, kinetics)).toBe(0)
    expect(depotFromDose(100, -1, kinetics)).toBe(0)
  })

  it('Δt=0 ⇒ central=dose e depot=0', () => {
    expect(stableBatemanAmount(100, 0, kinetics)).toBe(100)
    expect(depotFromDose(100, 0, kinetics)).toBe(0)
  })

  it('após 1 T½ ⇒ ≈50% (rtol normativo)', () => {
    const got = stableBatemanAmount(100, HALF_LIFE_MS, kinetics)
    expect(amountClose(got, 50)).toBe(true)
  })

  it('underflow legítimo ⇒ 0 sem erro', () => {
    expect(stableBatemanAmount(100, 10_000 * HALF_LIFE_MS, kinetics)).toBe(0)
  })
})

describe('Bateman estável — absorção finita', () => {
  const ke = eliminationRate(HALF_LIFE_MS)
  const ka = ke * 2

  it('Δt<0 ⇒ 0; Δt=0 ⇒ central=0 e depot=dose', () => {
    const kinetics = { kePerMs: ke, kaPerMs: ka }
    expect(stableBatemanAmount(100, -1, kinetics)).toBe(0)
    expect(stableBatemanAmount(100, 0, kinetics)).toBe(0)
    expect(depotFromDose(100, 0, kinetics)).toBe(100)
  })

  it('forma é finita em toda a vizinhança de ka=ke (sem NaN/Infinity)', () => {
    for (const factor of [0.99999999, 1.00000001]) {
      const got = stableBatemanAmount(100, 30 * MS_PER_HOUR, { kePerMs: ke, kaPerMs: ke * factor })
      expect(Number.isFinite(got)).toBe(true)
    }
  })

  it('ka=ke reduz exatamente à fórmula limite dose·k·t·exp(−kt)', () => {
    const k = ke
    const dt = 20 * MS_PER_HOUR
    const got = stableBatemanAmount(100, dt, { kePerMs: k, kaPerMs: k })
    const expected = 100 * k * dt * Math.exp(-k * dt)
    expect(amountClose(got, expected)).toBe(true)
  })

  it('continuidade cruzando ka=ke (perturbação de ±1e-6 relativa muda pouco)', () => {
    const dt = 12 * MS_PER_HOUR
    const at = (factor: number): number =>
      stableBatemanAmount(100, dt, { kePerMs: ke, kaPerMs: ke * factor })
    const center = at(1)
    const up = at(1 + 1e-6)
    const down = at(1 - 1e-6)
    expect(Math.abs(up - center) / center).toBeLessThan(1e-3)
    expect(Math.abs(center - down) / center).toBeLessThan(1e-3)
  })

  it('contribuição = central + depot e clamp [0,dose]', () => {
    const kinetics = { kePerMs: ke, kaPerMs: ka }
    const dt = 6 * MS_PER_HOUR
    const central = stableBatemanAmount(100, dt, kinetics)
    const depot = depotFromDose(100, dt, kinetics)
    expect(contributionFromDose(100, dt, kinetics)).toBe(central + depot)
    expect(contributionFromDose(100, dt, kinetics)).toBeLessThanOrEqual(100)
  })
})
