import { describe, expect, it } from 'vitest'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import {
  createComparatorIntent,
  createProtocolIntent,
} from '../../../features/library/lib/intents'
import type { SingleSubstance, BlendSubstance } from '../../../domain/library/types'

describe('E10 — CTA Intents Semânticos (Fronteira E10 × E12)', () => {
  const retatrutida = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'retatrutida') as SingleSubstance
  const durateston = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'durateston-landergold') as BlendSubstance

  describe('SingleSubstance CTAs', () => {
    it('produz LibraryComparatorIntent para Single sem doses, dose padrão ou amountMg', () => {
      const profile = retatrutida.profiles[0]
      const intent = createComparatorIntent({
        substance: retatrutida,
        profile,
        selection: {
          halfLifeMs: 6 * 86400000,
          tmaxMs: 2 * 86400000,
          snapshot: {
            halfLife: { value: 6, unit: 'days' },
            tmax: { value: 2, unit: 'days' },
          },
        },
      })

      expect(intent.kind).toBe('comparator')
      expect(intent.name).toBe('Retatrutida')
      expect(intent.selectedPkParameters.halfLifeMs).toBe(6 * 86400000)
      expect(intent.selectedPkParameters.tmaxMs).toBe(2 * 86400000)
      expect(intent.source.type).toBe('library')
      if (intent.source.type === 'library') {
        expect(intent.source.substanceId).toBe('retatrutida')
        expect(intent.source.profileId).toBe('legacy-v1')
        expect(intent.source.datasetVersion).toBe(1)
      }

      // Prova ausência absoluta de campos de dose
      expect('doses' in intent).toBe(false)
      expect('amountMg' in intent).toBe(false)
      expect('totalDoseMg' in intent).toBe(false)
    })

    it('produz LibraryProtocolIntent para Single com 1 componente e proportion=1, sem totalDoseMg ou schedule', () => {
      const profile = retatrutida.profiles[0]
      const intent = createProtocolIntent({
        substance: retatrutida,
        profile,
        selection: {
          halfLifeMs: 6 * 86400000,
          tmaxMs: 2 * 86400000,
          snapshot: {
            halfLife: { value: 6, unit: 'days' },
            tmax: { value: 2, unit: 'days' },
          },
        },
      })

      expect(intent.kind).toBe('protocol')
      expect(intent.name).toBe('Retatrutida')
      expect(intent.components).toHaveLength(1)
      expect(intent.components[0].proportion).toBe(1)
      expect(intent.components[0].source.type).toBe('library')
      if (intent.components[0].source.type === 'library') {
        expect(intent.components[0].source.substanceId).toBe('retatrutida')
        expect(intent.components[0].source.profileId).toBe('legacy-v1')
      }

      // Prova ausência de campos de dose ou agenda
      expect('totalDoseMg' in intent).toBe(false)
      expect('schedule' in intent).toBe(false)
      expect('doses' in intent).toBe(false)
      expect('componentDoseMg' in intent.components[0]).toBe(false)
    })
  })

  describe('BlendSubstance CTAs', () => {
    it('PROIBIDO: createComparatorIntent rejeita BlendSubstance com erro explícito ou retorna null', () => {
      expect(() => {
        createComparatorIntent({
          substance: durateston,
        })
      }).toThrow(/blend/i)
    })

    it('produz LibraryProtocolIntent para Blend com 3 componentes resolvíveis (0.2/0.4/0.4), sem dose total', () => {
      const intent = createProtocolIntent({
        substance: durateston,
        dataset: OFFICIAL_DATASET_V1,
      })

      expect(intent.kind).toBe('protocol')
      expect(intent.name).toBe('Durateston LANDERGOLD')
      expect(intent.components).toHaveLength(3)

      expect(intent.components[0].proportion).toBe(0.2)
      expect(intent.components[0].source.type).toBe('library')
      if (intent.components[0].source.type === 'library') {
        expect(intent.components[0].source.substanceId).toBe('landergold-propionato')
        expect(intent.components[0].source.profileId).toBe('legacy-v1')
      }

      expect(intent.components[1].proportion).toBe(0.4)
      if (intent.components[1].source.type === 'library') {
        expect(intent.components[1].source.substanceId).toBe('landergold-fenilpropionato')
        expect(intent.components[1].source.profileId).toBe('legacy-v1')
      }

      expect(intent.components[2].proportion).toBe(0.4)
      if (intent.components[2].source.type === 'library') {
        expect(intent.components[2].source.substanceId).toBe('landergold-isocaproato')
        expect(intent.components[2].source.profileId).toBe('legacy-v1')
      }

      // Prova ausência de dose total ou schedule
      expect('totalDoseMg' in intent).toBe(false)
      expect('schedule' in intent).toBe(false)
      expect('doses' in intent).toBe(false)
    })
  })
})
