import { describe, expect, it } from 'vitest'
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  compareDurationValues,
  durationValueToMs,
  fromMilligrams,
  millisecondsToDays,
  millisecondsToHours,
  millisecondsToMinutes,
  normalizeDurationRange,
  toMilliseconds,
  toMilligrams,
} from '../../domain/units/convert'

describe('conversões de tempo (unidade interna ms)', () => {
  it('constantes normativas', () => {
    expect(MS_PER_MINUTE).toBe(60_000)
    expect(MS_PER_HOUR).toBe(3_600_000)
    expect(MS_PER_DAY).toBe(86_400_000)
  })

  it('1 min → 60.000 ms; 1 h → 3.600.000 ms; 1 d → 86.400.000 ms', () => {
    expect(toMilliseconds(1, 'minutes')).toBe(60_000)
    expect(toMilliseconds(1, 'hours')).toBe(3_600_000)
    expect(toMilliseconds(1, 'days')).toBe(86_400_000)
  })

  it('inversas sem arredondamento interno', () => {
    expect(millisecondsToMinutes(60_000)).toBe(1)
    expect(millisecondsToHours(3_600_000)).toBe(1)
    expect(millisecondsToDays(86_400_000)).toBe(1)
    expect(millisecondsToMinutes(90_000)).toBe(1.5)
    expect(millisecondsToHours(43_200_000)).toBe(12)
  })

  it('24 h = 1 d e 0,5 d = 12 h via ms', () => {
    expect(toMilliseconds(24, 'hours')).toBe(toMilliseconds(1, 'days'))
    expect(millisecondsToHours(toMilliseconds(0.5, 'days'))).toBe(12)
  })

  it('matemática pura: NaN propaga como IEEE-754, sem coerção silenciosa', () => {
    expect(Number.isNaN(toMilliseconds(Number.NaN, 'minutes'))).toBe(true)
  })
})

describe('conversões de massa (unidade interna mg)', () => {
  it('1000 mcg = 1 mg; 1 g = 1000 mg', () => {
    expect(toMilligrams(1000, 'mcg')).toBe(1)
    expect(toMilligrams(1, 'g')).toBe(1000)
  })

  it('inversas: 1 mg = 1000 mcg; 0,001 mg = 1 mcg; 250 mcg = 0,25 mg', () => {
    expect(fromMilligrams(1, 'mcg')).toBe(1000)
    expect(toMilligrams(0.001, 'mg')).toBeCloseTo(0.001, 15)
    expect(toMilligrams(250, 'mcg')).toBeCloseTo(0.25, 15)
    expect(toMilligrams(1, 'mg')).toBe(1)
  })

  it('round-trip mcg ↔ mg preserva valor', () => {
    const valueMg = 0.25
    expect(fromMilligrams(toMilligrams(valueMg * 1000, 'mcg'), 'mcg') / 1000).toBe(valueMg)
  })
})

describe('DurationValue / DurationRange normalizados por ms', () => {
  it('durationValueToMs converte qualquer unidade', () => {
    expect(durationValueToMs({ value: 30, unit: 'minutes' })).toBe(1_800_000)
    expect(durationValueToMs({ value: 2, unit: 'hours' })).toBe(7_200_000)
    expect(durationValueToMs({ value: 1, unit: 'days' })).toBe(86_400_000)
  })

  it('comparação ocorre APÓS conversão para ms (unidades diferentes)', () => {
    expect(compareDurationValues({ value: 24, unit: 'hours' }, { value: 2, unit: 'days' })).toBeLessThan(0)
    expect(compareDurationValues({ value: 48, unit: 'hours' }, { value: 2, unit: 'days' })).toBe(0)
    expect(compareDurationValues({ value: 3, unit: 'days' }, { value: 1, unit: 'days' })).toBeGreaterThan(0)
  })

  it('normalizeDurationRange ordena por ms mesmo com unidades distintas/invertidas', () => {
    expect(normalizeDurationRange({ min: { value: 24, unit: 'hours' }, max: { value: 2, unit: 'days' } })).toEqual({
      minMs: 86_400_000,
      maxMs: 172_800_000,
    })
    expect(
      normalizeDurationRange({ min: { value: 3, unit: 'days' }, max: { value: 12, unit: 'hours' } }),
    ).toEqual({ minMs: 43_200_000, maxMs: 259_200_000 })
  })
})
