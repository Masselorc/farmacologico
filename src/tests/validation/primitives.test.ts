import { describe, expect, it } from 'vitest'
import {
  displayColorSchema,
  durationRangeSchema,
  durationValueSchema,
  finiteNumberSchema,
  instantIsoSchema,
  isoWeekdaySchema,
  localDateSchema,
  localTimeSchema,
  massUnitSchema,
  nameSchema,
  nonEmptyStringSchema,
  nonNegativeFiniteNumberSchema,
  paletteColorIdSchema,
  positiveFiniteNumberSchema,
  positiveIntegerSchema,
  timeUnitSchema,
  timeZoneIdSchema,
} from '../../validation/schemas/primitives'

describe('E5 Primitives Schemas — validações elementares (§6)', () => {
  describe('finiteNumberSchema', () => {
    it('aceita números finitos (positivos, zero, negativos)', () => {
      expect(finiteNumberSchema.safeParse(0).success).toBe(true)
      expect(finiteNumberSchema.safeParse(42.5).success).toBe(true)
      expect(finiteNumberSchema.safeParse(-10).success).toBe(true)
      expect(finiteNumberSchema.safeParse(1e-10).success).toBe(true)
    })

    it('rejeita NaN, Infinity, -Infinity e não números', () => {
      expect(finiteNumberSchema.safeParse(NaN).success).toBe(false)
      expect(finiteNumberSchema.safeParse(Infinity).success).toBe(false)
      expect(finiteNumberSchema.safeParse(-Infinity).success).toBe(false)
      expect(finiteNumberSchema.safeParse('10').success).toBe(false)
      expect(finiteNumberSchema.safeParse(null).success).toBe(false)
    })
  })

  describe('positiveFiniteNumberSchema', () => {
    it('aceita números finitos estritamente positivos', () => {
      expect(positiveFiniteNumberSchema.safeParse(0.0001).success).toBe(true)
      expect(positiveFiniteNumberSchema.safeParse(100).success).toBe(true)
    })

    it('rejeita zero, negativos, NaN e Infinity', () => {
      expect(positiveFiniteNumberSchema.safeParse(0).success).toBe(false)
      expect(positiveFiniteNumberSchema.safeParse(-1).success).toBe(false)
      expect(positiveFiniteNumberSchema.safeParse(NaN).success).toBe(false)
      expect(positiveFiniteNumberSchema.safeParse(Infinity).success).toBe(false)
    })
  })

  describe('nonNegativeFiniteNumberSchema', () => {
    it('aceita zero e números finitos positivos', () => {
      expect(nonNegativeFiniteNumberSchema.safeParse(0).success).toBe(true)
      expect(nonNegativeFiniteNumberSchema.safeParse(10.5).success).toBe(true)
    })

    it('rejeita números negativos e infinitos', () => {
      expect(nonNegativeFiniteNumberSchema.safeParse(-0.0001).success).toBe(false)
      expect(nonNegativeFiniteNumberSchema.safeParse(-Infinity).success).toBe(false)
    })
  })

  describe('positiveIntegerSchema', () => {
    it('aceita inteiros positivos', () => {
      expect(positiveIntegerSchema.safeParse(1).success).toBe(true)
      expect(positiveIntegerSchema.safeParse(520).success).toBe(true)
    })

    it('rejeita decimais, zero, negativos e não números', () => {
      expect(positiveIntegerSchema.safeParse(1.5).success).toBe(false)
      expect(positiveIntegerSchema.safeParse(0).success).toBe(false)
      expect(positiveIntegerSchema.safeParse(-2).success).toBe(false)
    })
  })

  describe('nonEmptyStringSchema', () => {
    it('aceita strings não vazias', () => {
      expect(nonEmptyStringSchema.safeParse('texto').success).toBe(true)
      expect(nonEmptyStringSchema.safeParse('a').success).toBe(true)
    })

    it('rejeita strings vazias ou não strings', () => {
      expect(nonEmptyStringSchema.safeParse('').success).toBe(false)
      expect(nonEmptyStringSchema.safeParse(null).success).toBe(false)
      expect(nonEmptyStringSchema.safeParse(123).success).toBe(false)
    })
  })

  describe('nameSchema', () => {
    it('aceita nomes válidos de 1 a 100 caracteres', () => {
      expect(nameSchema.safeParse('Enantato').success).toBe(true)
      expect(nameSchema.safeParse('A'.repeat(100)).success).toBe(true)
    })

    it('rejeita strings vazias, apenas espaços ou acima de 100 caracteres', () => {
      expect(nameSchema.safeParse('').success).toBe(false)
      expect(nameSchema.safeParse('   ').success).toBe(false)
      expect(nameSchema.safeParse('A'.repeat(101)).success).toBe(false)
    })
  })

  describe('temporal schemas', () => {
    it('instantIsoSchema valida instantes UTC canônicos', () => {
      expect(instantIsoSchema.safeParse('2026-08-26T12:00:00Z').success).toBe(true)
      expect(instantIsoSchema.safeParse('2026-08-26T12:00:00.000Z').success).toBe(true)
      expect(instantIsoSchema.safeParse('data-invalida').success).toBe(false)
      expect(instantIsoSchema.safeParse('2026-02-31T00:00:00Z').success).toBe(false)
    })

    it('localDateSchema valida YYYY-MM-DD civil estrito', () => {
      expect(localDateSchema.safeParse('2026-08-26').success).toBe(true)
      expect(localDateSchema.safeParse('2024-02-29').success).toBe(true) // bissexto
      expect(localDateSchema.safeParse('2025-02-29').success).toBe(false) // não bissexto
      expect(localDateSchema.safeParse('26/08/2026').success).toBe(false)
    })

    it('localTimeSchema valida HH:MM civil estrito', () => {
      expect(localTimeSchema.safeParse('08:00').success).toBe(true)
      expect(localTimeSchema.safeParse('23:59').success).toBe(true)
      expect(localTimeSchema.safeParse('24:00').success).toBe(false)
      expect(localTimeSchema.safeParse('8:00').success).toBe(false)
    })

    it('timeZoneIdSchema valida fusos IANA', () => {
      expect(timeZoneIdSchema.safeParse('America/Sao_Paulo').success).toBe(true)
      expect(timeZoneIdSchema.safeParse('UTC').success).toBe(true)
      expect(timeZoneIdSchema.safeParse('America/New_York').success).toBe(true)
      expect(timeZoneIdSchema.safeParse('Fuso/Invalido').success).toBe(false)
    })

    it('isoWeekdaySchema aceita 1 a 7 e rejeita outros', () => {
      for (let day = 1; day <= 7; day++) {
        expect(isoWeekdaySchema.safeParse(day).success).toBe(true)
      }
      expect(isoWeekdaySchema.safeParse(0).success).toBe(false)
      expect(isoWeekdaySchema.safeParse(8).success).toBe(false)
    })
  })

  describe('unit & duration schemas', () => {
    it('massUnitSchema aceita unidades suportadas', () => {
      expect(massUnitSchema.safeParse('mcg').success).toBe(true)
      expect(massUnitSchema.safeParse('mg').success).toBe(true)
      expect(massUnitSchema.safeParse('g').success).toBe(true)
      expect(massUnitSchema.safeParse('kg').success).toBe(false)
    })

    it('timeUnitSchema aceita minutes, hours, days', () => {
      expect(timeUnitSchema.safeParse('minutes').success).toBe(true)
      expect(timeUnitSchema.safeParse('hours').success).toBe(true)
      expect(timeUnitSchema.safeParse('days').success).toBe(true)
      expect(timeUnitSchema.safeParse('seconds').success).toBe(false)
    })

    it('durationValueSchema valida e rejeita unknown keys', () => {
      const val = { value: 7, unit: 'days' as const }
      expect(durationValueSchema.safeParse(val).success).toBe(true)
      expect(durationValueSchema.safeParse({ value: 0, unit: 'days' }).success).toBe(false)
      expect(durationValueSchema.safeParse({ ...val, extraField: 'proibido' }).success).toBe(false)
    })

    it('durationRangeSchema aceita intervalos onde min <= max após conversão de unidades', () => {
      // 1d .. 2d
      expect(
        durationRangeSchema.safeParse({
          min: { value: 1, unit: 'days' },
          max: { value: 2, unit: 'days' },
        }).success,
      ).toBe(true)

      // 24h .. 2d (86400000 <= 172800000)
      expect(
        durationRangeSchema.safeParse({
          min: { value: 24, unit: 'hours' },
          max: { value: 2, unit: 'days' },
        }).success,
      ).toBe(true)

      // 24h .. 1d (86400000 <= 86400000)
      expect(
        durationRangeSchema.safeParse({
          min: { value: 24, unit: 'hours' },
          max: { value: 1, unit: 'days' },
        }).success,
      ).toBe(true)

      // 1440min .. 1d (86400000 <= 86400000)
      expect(
        durationRangeSchema.safeParse({
          min: { value: 1440, unit: 'minutes' },
          max: { value: 1, unit: 'days' },
        }).success,
      ).toBe(true)
    })

    it('durationRangeSchema rejeita intervalos onde min > max após conversão de unidades', () => {
      // 3d .. 48h (259200000 > 172800000)
      expect(
        durationRangeSchema.safeParse({
          min: { value: 3, unit: 'days' },
          max: { value: 48, unit: 'hours' },
        }).success,
      ).toBe(false)

      // 49h .. 2d (176400000 > 172800000)
      expect(
        durationRangeSchema.safeParse({
          min: { value: 49, unit: 'hours' },
          max: { value: 2, unit: 'days' },
        }).success,
      ).toBe(false)

      // 2d .. 1439min (172800000 > 86340000)
      expect(
        durationRangeSchema.safeParse({
          min: { value: 2, unit: 'days' },
          max: { value: 1439, unit: 'minutes' },
        }).success,
      ).toBe(false)
    })

    it('durationRangeSchema rejeita unknown keys', () => {
      expect(
        durationRangeSchema.safeParse({
          min: { value: 1, unit: 'days' },
          max: { value: 2, unit: 'days' },
          unexpected: true,
        }).success,
      ).toBe(false)
    })

    it('displayColorSchema valida paletteColor e legacyOriginalHex opcional, rejeitando unknown keys', () => {
      expect(paletteColorIdSchema.safeParse('blue-500').success).toBe(true)
      expect(paletteColorIdSchema.safeParse('').success).toBe(false)
      expect(displayColorSchema.safeParse({ paletteColor: 'blue-500' }).success).toBe(true)
      expect(
        displayColorSchema.safeParse({ paletteColor: 'blue-500', legacyOriginalHex: '#0055ff' }).success,
      ).toBe(true)
      expect(displayColorSchema.safeParse({ paletteColor: '' }).success).toBe(false)
      expect(
        displayColorSchema.safeParse({ paletteColor: 'blue-500', extra: 123 }).success,
      ).toBe(false)
    })
  })
})
