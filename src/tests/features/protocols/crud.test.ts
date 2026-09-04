import { describe, expect, it } from 'vitest'
import {
  createEmptyProtocolDraft,
  draftToProtocol,
  protocolToDraft,
} from '../../../features/protocols/lib/drafts'
import type { Protocol } from '../../../domain/types'

describe('protocols/lib/drafts CRUD', () => {
  it('createEmptyProtocolDraft inicia com totalDoseMg estritamente vazio', () => {
    const draft = createEmptyProtocolDraft('America/Sao_Paulo', '2026-09-04')
    expect(draft.totalDoseMg).toBe('')
    expect(draft.name).toBe('')
    expect(draft.components).toHaveLength(1)
    expect(draft.components[0]!.proportion).toBe('1')
  })

  it('draftToProtocol converte decimais pt-BR e dias para ms com Tmax 0 como null', () => {
    const draft = createEmptyProtocolDraft('America/Sao_Paulo', '2026-09-04')
    draft.name = 'Protocolo Teste'
    draft.totalDoseMg = '250,5'
    draft.components[0]!.halfLifeDays = '5,5'
    draft.components[0]!.tmaxDays = '0'

    const result = draftToProtocol(draft)
    expect(result.ok).toBe(true)

    if (result.ok) {
      const proto = result.value
      expect(proto.name).toBe('Protocolo Teste')
      expect(proto.totalDoseMg).toBe(250.5)
      expect(proto.components[0]!.selectedPkParameters.halfLifeMs).toBe(5.5 * 86400000)
      expect(proto.components[0]!.selectedPkParameters.tmaxMs).toBeNull()
      expect(proto.components[0]!.pkParametersSnapshot.halfLife.value).toBe(5.5)
    }
  })

  it('roundtrip protocolToDraft -> draftToProtocol preserva identidade e dados', () => {
    const original: Protocol = {
      id: 'proto-roundtrip',
      name: 'Enantato Semanal',
      totalDoseMg: 300,
      schedule: {
        startDate: '2026-09-04',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: {
          type: 'weekly',
          weekdays: [1, 4],
          weeks: 12,
        },
      },
      components: [
        {
          id: 'c-1',
          label: 'Enantato',
          proportion: 1,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 6 * 86400000, tmaxMs: 2 * 86400000 },
          pkParametersSnapshot: {
            halfLife: { value: 6, unit: 'days' },
            tmax: { value: 2, unit: 'days' },
          },
          displayColor: { paletteColor: '#2563eb' },
        },
      ],
      createdAt: '2026-09-04T00:00:00Z',
      updatedAt: '2026-09-04T00:00:00Z',
    }

    const draft = protocolToDraft(original)
    const result = draftToProtocol(draft, original)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe(original.id)
      expect(result.value.name).toBe(original.name)
      expect(result.value.totalDoseMg).toBe(original.totalDoseMg)
      expect(result.value.components[0]!.selectedPkParameters.halfLifeMs).toBe(
        original.components[0]!.selectedPkParameters.halfLifeMs,
      )
    }
  })

  it('retorna erros de validação quando campos obrigatórios são inválidos', () => {
    const draft = createEmptyProtocolDraft('America/Sao_Paulo', '2026-09-04')
    draft.name = ''
    draft.totalDoseMg = '' // vazio

    const resEmpty = draftToProtocol(draft)
    expect(resEmpty.ok).toBe(false)
    if (!resEmpty.ok) {
      expect(resEmpty.error.some((e) => e.includes('dose total'))).toBe(true)
    }

    // Semanas > 520
    draft.name = 'Válido'
    draft.totalDoseMg = '100'
    draft.weeks = '600'
    const resWeeks = draftToProtocol(draft)
    expect(resWeeks.ok).toBe(false)
    if (!resWeeks.ok) {
      expect(resWeeks.error.some((e) => e.includes('520'))).toBe(true)
    }
  })
})
