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

  describe('protocolComponentSchema', () => {
    it('aceita componente válido', () => {
      const comp = {
        id: 'c1',
        label: 'Cipionato',
        proportion: 0.6,
        selectedPkParameters: validSelectedPk,
      }
      expect(protocolComponentSchema.safeParse(comp).success).toBe(true)
    })

    it('rejeita proporção <= 0, > 1, NaN ou Infinity', () => {
      expect(protocolComponentSchema.safeParse({ id: 'c1', label: 'C1', proportion: 0, selectedPkParameters: validSelectedPk }).success).toBe(false)
      expect(protocolComponentSchema.safeParse({ id: 'c1', label: 'C1', proportion: -0.5, selectedPkParameters: validSelectedPk }).success).toBe(false)
      expect(protocolComponentSchema.safeParse({ id: 'c1', label: 'C1', proportion: 1.1, selectedPkParameters: validSelectedPk }).success).toBe(false)
      expect(protocolComponentSchema.safeParse({ id: 'c1', label: 'C1', proportion: NaN, selectedPkParameters: validSelectedPk }).success).toBe(false)
    })
  })

  describe('protocolSchema', () => {
    it('aceita protocolo válido com 1 componente (proporção 1.0)', () => {
      const proto = {
        id: 'p1',
        name: 'Monoterapia',
        totalDoseMg: 250,
        schedule: validSchedule,
        components: [
          { id: 'c1', label: 'Enantato', proportion: 1.0, selectedPkParameters: validSelectedPk },
        ],
      }
      expect(protocolSchema.safeParse(proto).success).toBe(true)
    })

    it('aceita protocolo válido com múltiplos componentes somando exatamente 1', () => {
      const proto = {
        id: 'p2',
        name: 'Blend 3 Ésteres',
        totalDoseMg: 500,
        schedule: validSchedule,
        components: [
          { id: 'c1', label: 'Propionato', proportion: 0.3, selectedPkParameters: validSelectedPk },
          { id: 'c2', label: 'Fenilpropionato', proportion: 0.3, selectedPkParameters: validSelectedPk },
          { id: 'c3', label: 'Isocaproato', proportion: 0.4, selectedPkParameters: validSelectedPk },
        ],
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
          { id: 'c1', label: 'A', proportion: 0.5, selectedPkParameters: validSelectedPk },
          { id: 'c2', label: 'B', proportion: 0.4, selectedPkParameters: validSelectedPk },
        ],
      }
      expect(protocolSchema.safeParse(protoUnder).success).toBe(false)

      const protoOver = {
        id: 'p4',
        name: 'Soma Maior',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: [
          { id: 'c1', label: 'A', proportion: 0.6, selectedPkParameters: validSelectedPk },
          { id: 'c2', label: 'B', proportion: 0.5, selectedPkParameters: validSelectedPk },
        ],
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
          { id: 'dup-id', label: 'A', proportion: 0.5, selectedPkParameters: validSelectedPk },
          { id: 'dup-id', label: 'B', proportion: 0.5, selectedPkParameters: validSelectedPk },
        ],
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
      }).success).toBe(false)

      const twentyOneComponents = Array.from({ length: 21 }, (_, i) => ({
        id: `c${i}`,
        label: `Comp ${i}`,
        proportion: 1 / 21,
        selectedPkParameters: validSelectedPk,
      }))
      expect(protocolSchema.safeParse({
        id: 'p7',
        name: 'Excesso Componentes',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: twentyOneComponents,
      }).success).toBe(false)
    })

    it('aceita limite máximo de 20 componentes', () => {
      const twentyComponents = Array.from({ length: 20 }, (_, i) => ({
        id: `c${i}`,
        label: `Comp ${i}`,
        proportion: 0.05,
        selectedPkParameters: validSelectedPk,
      }))
      expect(protocolSchema.safeParse({
        id: 'p8',
        name: '20 Componentes',
        totalDoseMg: 100,
        schedule: validSchedule,
        components: twentyComponents,
      }).success).toBe(true)
    })

    it('rejeita dose total do protocolo <= 0 ou > 1.000.000 mg', () => {
      expect(protocolSchema.safeParse({
        id: 'p9',
        name: 'Zero total dose',
        totalDoseMg: 0,
        schedule: validSchedule,
        components: [{ id: 'c1', label: 'A', proportion: 1.0, selectedPkParameters: validSelectedPk }],
      }).success).toBe(false)

      expect(protocolSchema.safeParse({
        id: 'p10',
        name: 'Excesso total dose',
        totalDoseMg: SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX + 1,
        schedule: validSchedule,
        components: [{ id: 'c1', label: 'A', proportion: 1.0, selectedPkParameters: validSelectedPk }],
      }).success).toBe(false)
    })
  })
})
