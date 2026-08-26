import { describe, expect, it } from 'vitest'
import { SAFETY_LIMITS } from '../../validation/limits'
import { doseDraftSchema, doseSchema, scenarioSchema, scenarioSourceSchema } from '../../validation/schemas/scenario'

describe('E5 Dose & Scenario Schemas (§6)', () => {
  describe('doseSchema', () => {
    it('aceita dose válida', () => {
      const parsed = doseSchema.safeParse({
        id: 'd1',
        amountMg: 250,
        time: '2026-08-26T12:00:00Z',
      })
      expect(parsed.success).toBe(true)
    })

    it('aceita fronteiras de dose (0.001 mg até 1.000.000 mg)', () => {
      expect(doseSchema.safeParse({ id: 'd1', amountMg: 0.001, time: '2026-08-26T12:00:00Z' }).success).toBe(true)
      expect(doseSchema.safeParse({ id: 'd1', amountMg: SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX, time: '2026-08-26T12:00:00Z' }).success).toBe(true)
    })

    it('rejeita dose com valor <= 0, > 1.000.000 mg, NaN ou Infinity', () => {
      expect(doseSchema.safeParse({ id: 'd1', amountMg: 0, time: '2026-08-26T12:00:00Z' }).success).toBe(false)
      expect(doseSchema.safeParse({ id: 'd1', amountMg: -10, time: '2026-08-26T12:00:00Z' }).success).toBe(false)
      expect(doseSchema.safeParse({ id: 'd1', amountMg: SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX + 1, time: '2026-08-26T12:00:00Z' }).success).toBe(false)
      expect(doseSchema.safeParse({ id: 'd1', amountMg: NaN, time: '2026-08-26T12:00:00Z' }).success).toBe(false)
    })

    it('rejeita dose com time inválido ou id vazio', () => {
      expect(doseSchema.safeParse({ id: '', amountMg: 100, time: '2026-08-26T12:00:00Z' }).success).toBe(false)
      expect(doseSchema.safeParse({ id: 'd1', amountMg: 100, time: 'invalid-time' }).success).toBe(false)
    })
  })

  describe('doseDraftSchema', () => {
    it('permite amountMg nulo e datas locais incompletas', () => {
      expect(doseDraftSchema.safeParse({ id: 'draft-1', amountMg: null }).success).toBe(true)
      expect(doseDraftSchema.safeParse({ id: 'draft-2', amountMg: 50, localDate: '2026-08-26' }).success).toBe(true)
    })
  })

  describe('scenarioSourceSchema', () => {
    it('valida sources library, custom_profile e manual', () => {
      const lib = {
        type: 'library',
        substanceId: 'testo-e',
        profileId: 'default',
        datasetVersion: 1,
        pkParametersSnapshot: { halfLife: { value: 4.5, unit: 'days' }, tmax: null },
      }
      expect(scenarioSourceSchema.safeParse(lib).success).toBe(true)

      const custom = {
        type: 'custom_profile',
        customProfileId: 'cp-1',
        pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
      }
      expect(scenarioSourceSchema.safeParse(custom).success).toBe(true)

      const manual = { type: 'manual' }
      expect(scenarioSourceSchema.safeParse(manual).success).toBe(true)
    })
  })

  describe('scenarioSchema', () => {
    it('valida cenário completo com doses e source obrigatório', () => {
      const scenario = {
        id: 'sc-1',
        name: 'Cenário Teste',
        color: '#0055ff',
        source: { type: 'manual' as const },
        displayUnit: 'mg' as const,
        selectedPkParameters: { halfLifeMs: 86_400_000, tmaxMs: null },
        doses: [
          { id: 'd1', amountMg: 100, time: '2026-08-26T12:00:00Z' },
        ],
      }
      expect(scenarioSchema.safeParse(scenario).success).toBe(true)
    })

    it('rejeita cenário sem source (source é obrigatório no contrato normativo)', () => {
      const scenario = {
        id: 'sc-1',
        name: 'Cenário Sem Source',
        color: '#0055ff',
        displayUnit: 'mg' as const,
        selectedPkParameters: { halfLifeMs: 86_400_000, tmaxMs: null },
        doses: [],
      }
      expect(scenarioSchema.safeParse(scenario).success).toBe(false)
    })

    it('aceita cenário com cada variante de source (library, custom_profile, manual)', () => {
      const base = {
        id: 'sc-1',
        name: 'Cenário',
        color: 'blue-500',
        displayUnit: 'mg' as const,
        selectedPkParameters: { halfLifeMs: 86_400_000, tmaxMs: null },
        doses: [],
      }

      // library
      expect(
        scenarioSchema.safeParse({
          ...base,
          source: {
            type: 'library',
            substanceId: 'testo-e',
            profileId: 'default',
            datasetVersion: 1,
            pkParametersSnapshot: { halfLife: { value: 4.5, unit: 'days' }, tmax: null },
          },
        }).success,
      ).toBe(true)

      // custom_profile
      expect(
        scenarioSchema.safeParse({
          ...base,
          source: {
            type: 'custom_profile',
            customProfileId: 'cp-1',
            pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
          },
        }).success,
      ).toBe(true)

      // manual
      expect(
        scenarioSchema.safeParse({
          ...base,
          source: { type: 'manual' },
        }).success,
      ).toBe(true)
    })

    it('rejeita cenário com mais de 2000 doses', () => {
      const doses = Array.from({ length: SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX + 1 }, (_, i) => ({
        id: `d${i}`,
        amountMg: 10,
        time: '2026-08-26T12:00:00Z',
      }))
      const scenario = {
        id: 'sc-1',
        name: 'Excesso Doses',
        color: '#0055ff',
        source: { type: 'manual' as const },
        displayUnit: 'mg' as const,
        selectedPkParameters: { halfLifeMs: 86_400_000, tmaxMs: null },
        doses,
      }
      expect(scenarioSchema.safeParse(scenario).success).toBe(false)
    })

    it('rejeita unknown keys em doseSchema e scenarioSchema', () => {
      // dose com campo extra
      expect(
        doseSchema.safeParse({
          id: 'd1',
          amountMg: 100,
          time: '2026-08-26T12:00:00Z',
          extra: 'proibido',
        }).success,
      ).toBe(false)

      // scenario com campo extra
      expect(
        scenarioSchema.safeParse({
          id: 'sc-1',
          name: 'Cenário',
          color: 'blue-500',
          source: { type: 'manual' },
          displayUnit: 'mg',
          selectedPkParameters: { halfLifeMs: 86_400_000, tmaxMs: null },
          doses: [],
          extraField: true,
        }).success,
      ).toBe(false)
    })
  })
})
