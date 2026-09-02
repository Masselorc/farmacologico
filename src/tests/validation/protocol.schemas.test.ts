import { describe, expect, it } from 'vitest'
import { SAFETY_LIMITS } from '../../validation/limits'
import { protocolComponentSchema, protocolSchema } from '../../validation/schemas/protocol'

describe('E5 Protocol Schemas (§6)', () => {
  const validSchedule = {
    startDate: '2026-08-26',
    localTime: '08:00',
    timeZone: 'America/Sao_Paulo',
    recurrence: { type: 'single' as const },
  }

  const validSelectedPk = {
    halfLifeMs: 86_400_000,
    tmaxMs: null,
  }

  const validSnapshot = {
    halfLife: { value: 24, unit: 'hours' as const },
    tmax: null,
  }

  const validDisplayColor = {
    paletteColor: '#2563eb',
  }

  function makeComponent(id: string, label: string, proportion: number) {
    return {
      id,
      label,
      proportion,
      source: { type: 'manual' as const },
      selectedPkParameters: validSelectedPk,
      pkParametersSnapshot: validSnapshot,
      displayColor: validDisplayColor,
    }
  }

  describe('protocolComponentSchema', () => {
    it('aceita componente válido completo', () => {
      const comp = makeComponent('c1', 'Cipionato', 0.6)
      expect(protocolComponentSchema.safeParse(comp).success).toBe(true)
    })

    it('aceita proporção finite > 0 sem teto artificial individual p <= 1', () => {
      expect(protocolComponentSchema.safeParse(makeComponent('c1', 'C1', 1.0)).success).toBe(true)
      expect(protocolComponentSchema.safeParse(makeComponent('c1', 'C1', 1 + 5e-13)).success).toBe(true)
      expect(protocolComponentSchema.safeParse(makeComponent('c1', 'C1', 1 + 2e-12)).success).toBe(true)
      expect(protocolComponentSchema.safeParse(makeComponent('c1', 'C1', 1.5)).success).toBe(true)
    })

    it('rejeita componente sem source (obrigatório)', () => {
      const comp = makeComponent('c1', 'C1', 0.6) as Record<string, unknown>
      delete comp.source
      expect(protocolComponentSchema.safeParse(comp).success).toBe(false)
    })

    it('rejeita componente sem pkParametersSnapshot (obrigatório)', () => {
      const comp = makeComponent('c1', 'C1', 0.6) as Record<string, unknown>
      delete comp.pkParametersSnapshot
      expect(protocolComponentSchema.safeParse(comp).success).toBe(false)
    })

    it('rejeita componente sem displayColor (obrigatório)', () => {
      const comp = makeComponent('c1', 'C1', 0.6) as Record<string, unknown>
      delete comp.displayColor
      expect(protocolComponentSchema.safeParse(comp).success).toBe(false)
    })

    it('rejeita componente com displayColor como string simples', () => {
      const invalidColor = { ...makeComponent('c1', 'C1', 0.6), displayColor: '#0055ff' }
      expect(protocolComponentSchema.safeParse(invalidColor).success).toBe(false)
    })

    it('rejeita proporção individual não positiva (<= 0, NaN ou Infinity)', () => {
      expect(protocolComponentSchema.safeParse({ ...makeComponent('c1', 'C1', 0), proportion: 0 }).success).toBe(false)
      expect(protocolComponentSchema.safeParse({ ...makeComponent('c1', 'C1', -0.5), proportion: -0.5 }).success).toBe(false)
      expect(protocolComponentSchema.safeParse({ ...makeComponent('c1', 'C1', NaN), proportion: NaN }).success).toBe(false)
      expect(protocolComponentSchema.safeParse({ ...makeComponent('c1', 'C1', Infinity), proportion: Infinity }).success).toBe(false)
    })

    it('rejeita unknown keys em protocolComponentSchema', () => {
      const comp = { ...makeComponent('c1', 'C1', 0.6), extra: 'proibido' }
      expect(protocolComponentSchema.safeParse(comp).success).toBe(false)
    })
  })

  describe('protocolSchema', () => {
    it('aceita protocolo válido com 1 componente (proporção 1.0) e timestamps ISO obrigatórios', () => {
      const proto = {
        id: 'p1',
        name: 'Monoterapia',
        totalDoseMg: 250,
        schedule: validSchedule,
        components: [makeComponent('c1', 'Enantato', 1.0)],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }
      expect(protocolSchema.safeParse(proto).success).toBe(true)
    })

    it('fronteira de tolerância (1 componente): aceita 1 + 5e-13 (<= 1e-12) e rejeita 1 + 2e-12 (> 1e-12)', () => {
      const base = {
        id: 'p1',
        name: 'Monoterapia Tolerância',
        totalDoseMg: 100,
        schedule: validSchedule,
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }

      // 1 + 5e-13 -> dentro da tolerância PROPORTION_SUM_ATOL = 1e-12 -> PASS
      const withinTolerance = {
        ...base,
        components: [makeComponent('c1', 'Comp', 1 + 5e-13)],
      }
      expect(protocolSchema.safeParse(withinTolerance).success).toBe(true)

      // 1 + 2e-12 -> fora da tolerância PROPORTION_SUM_ATOL = 1e-12 -> FAIL por proportionSumClose
      const outsideTolerance = {
        ...base,
        components: [makeComponent('c1', 'Comp', 1 + 2e-12)],
      }
      expect(protocolSchema.safeParse(outsideTolerance).success).toBe(false)
    })

    it('fronteira de tolerância (múltiplos componentes): aceita soma dentro de 1e-12 e rejeita fora', () => {
      const base = {
        id: 'p2',
        name: 'Blend Tolerância',
        totalDoseMg: 100,
        schedule: validSchedule,
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }

      // [0.5, 0.5 + 5e-13] -> soma = 1 + 5e-13 -> PASS
      const withinTol = {
        ...base,
        components: [
          makeComponent('c1', 'A', 0.5),
          makeComponent('c2', 'B', 0.5 + 5e-13),
        ],
      }
      expect(protocolSchema.safeParse(withinTol).success).toBe(true)

      // [0.5, 0.5 + 2e-12] -> soma = 1 + 2e-12 -> FAIL
      const outsideTol = {
        ...base,
        components: [
          makeComponent('c1', 'A', 0.5),
          makeComponent('c2', 'B', 0.5 + 2e-12),
        ],
      }
      expect(protocolSchema.safeParse(outsideTol).success).toBe(false)
    })

    it('rejeita protocolo sem createdAt ou sem updatedAt', () => {
      const base = {
        id: 'p1',
        name: 'Monoterapia',
        totalDoseMg: 250,
        schedule: validSchedule,
        components: [makeComponent('c1', 'Enantato', 1.0)],
      }
      expect(protocolSchema.safeParse({ ...base, updatedAt: '2026-08-26T12:00:00Z' }).success).toBe(false)
      expect(protocolSchema.safeParse({ ...base, createdAt: '2026-08-26T12:00:00Z' }).success).toBe(false)
    })

    it('aceita protocolo válido com múltiplos componentes somando exatamente 1', () => {
      const proto = {
        id: 'p2',
        name: 'Blend 3 Ésteres',
        totalDoseMg: 500,
        schedule: validSchedule,
        components: [
          makeComponent('c1', 'Propionato', 0.3),
          makeComponent('c2', 'Fenilpropionato', 0.3),
          makeComponent('c3', 'Isocaproato', 0.4),
        ],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }
      expect(protocolSchema.safeParse(proto).success).toBe(true)
    })

    it('rejeita protocolo cujas proporções não somam 1 (tolerância 1e-12)', () => {
      const protoUnder = {
        id: 'p3',
        name: 'Soma Menor',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: [
          makeComponent('c1', 'A', 0.5),
          makeComponent('c2', 'B', 0.4),
        ],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }
      expect(protocolSchema.safeParse(protoUnder).success).toBe(false)

      const protoOver = {
        id: 'p4',
        name: 'Soma Maior',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: [
          makeComponent('c1', 'A', 0.6),
          makeComponent('c2', 'B', 0.5),
        ],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }
      expect(protocolSchema.safeParse(protoOver).success).toBe(false)
    })

    it('rejeita protocolo com IDs de componentes duplicados', () => {
      const proto = {
        id: 'p5',
        name: 'IDs Duplicados',
        totalDoseMg: 200,
        schedule: validSchedule,
        components: [
          makeComponent('dup-id', 'A', 0.5),
          makeComponent('dup-id', 'B', 0.5),
        ],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }
      expect(protocolSchema.safeParse(proto).success).toBe(false)
    })

    it('rejeita protocolo com 0 componentes ou mais que 20 componentes', () => {
      expect(protocolSchema.safeParse({
        id: 'p6',
        name: 'Vazio',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: [],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }).success).toBe(false)

      const twentyOneComponents = Array.from({ length: 21 }, (_, i) => makeComponent(`c${i}`, `Comp ${i}`, 1 / 21))
      expect(protocolSchema.safeParse({
        id: 'p7',
        name: 'Excesso Componentes',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: twentyOneComponents,
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }).success).toBe(false)
    })

    it('aceita limite máximo de 20 componentes', () => {
      const twentyComponents = Array.from({ length: 20 }, (_, i) => makeComponent(`c${i}`, `Comp ${i}`, 0.05))
      expect(protocolSchema.safeParse({
        id: 'p8',
        name: '20 Componentes',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: twentyComponents,
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }).success).toBe(true)
    })

    it('rejeita dose total do protocolo <= 0 ou > 1.000.000 mg', () => {
      expect(protocolSchema.safeParse({
        id: 'p9',
        name: 'Zero total dose',
        totalDoseMg: 0,
        schedule: validSchedule,
        components: [makeComponent('c1', 'A', 1.0)],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }).success).toBe(false)

      expect(protocolSchema.safeParse({
        id: 'p10',
        name: 'Excesso total dose',
        totalDoseMg: SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX + 1,
        schedule: validSchedule,
        components: [makeComponent('c1', 'A', 1.0)],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
      }).success).toBe(false)
    })

    it('rejeita unknown keys em protocolSchema', () => {
      const proto = {
        id: 'p1',
        name: 'Monoterapia',
        totalDoseMg: 250,
        schedule: validSchedule,
        components: [makeComponent('c1', 'Enantato', 1.0)],
        createdAt: '2026-08-26T12:00:00Z',
        updatedAt: '2026-08-26T12:00:00Z',
        extraField: 'proibido',
      }
      expect(protocolSchema.safeParse(proto).success).toBe(false)
    })
  })
})
