import { describe, expect, it } from 'vitest'
import {
  CLICK_SUPPRESSION_MS,
  computeCivilDayDelta,
  DRAG_THRESHOLD_PX,
  rescheduleProtocol,
  UNDO_AUTO_DISMISS_MS,
} from '../../../features/protocols/lib/movement'
import type { Protocol } from '../../../domain/types'

describe('protocols/lib/movement', () => {
  it('constantes normativas de movimento e desfazer possuem os valores especificados', () => {
    expect(DRAG_THRESHOLD_PX).toBe(7)
    expect(CLICK_SUPPRESSION_MS).toBe(800)
    expect(UNDO_AUTO_DISMISS_MS).toBe(7000)
  })

  it('computeCivilDayDelta calcula a diferença de dias civis por PlainDate', () => {
    expect(computeCivilDayDelta('2026-09-01', '2026-09-05')).toBe(4)
    expect(computeCivilDayDelta('2026-09-05', '2026-09-01')).toBe(-4)
    expect(computeCivilDayDelta('2026-09-01', '2026-09-01')).toBe(0)
    expect(computeCivilDayDelta('2026-08-31', '2026-09-01')).toBe(1)
  })

  it('rescheduleProtocol move data de início e rotaciona dias da semana preservando horário e fuso', () => {
    const protocol: Protocol = {
      id: 'proto-move',
      name: 'Semanal',
      totalDoseMg: 200,
      schedule: {
        startDate: '2026-09-01', // Terça-feira (ISO 2)
        localTime: '09:30',
        timeZone: 'America/Sao_Paulo',
        recurrence: {
          type: 'weekly',
          weekdays: [2, 5], // Terça e Sexta
          weeks: 8,
        },
      },
      components: [
        {
          id: 'comp-1',
          label: 'Cipionato',
          proportion: 1,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 8 * 86400000, tmaxMs: 2 * 86400000 },
          pkParametersSnapshot: {
            halfLife: { value: 8, unit: 'days' },
            tmax: { value: 2, unit: 'days' },
          },
          displayColor: { paletteColor: '#2563eb' },
        },
      ],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }

    // Desloca +2 dias (Terça -> Quinta, Sexta -> Domingo)
    const shifted = rescheduleProtocol(protocol, 2, '2026-09-01T12:00:00Z')

    expect(shifted.schedule.startDate).toBe('2026-09-03')
    expect(shifted.schedule.localTime).toBe('09:30')
    expect(shifted.schedule.timeZone).toBe('America/Sao_Paulo')
    expect(shifted.updatedAt).toBe('2026-09-01T12:00:00Z')

    if (shifted.schedule.recurrence.type === 'weekly') {
      expect(shifted.schedule.recurrence.weekdays).toEqual([4, 7]) // Quinta (4) e Domingo (7)
    } else {
      expect.unreachable()
    }
  })

  it('rescheduleProtocol rotaciona dias da semana no domingo (7 + 1 = 1)', () => {
    const protocol: Protocol = {
      id: 'proto-sun',
      name: 'Domingo',
      totalDoseMg: 100,
      schedule: {
        startDate: '2026-09-06', // Domingo
        localTime: '08:00',
        timeZone: 'UTC',
        recurrence: {
          type: 'weekly',
          weekdays: [7], // Domingo
          weeks: 4,
        },
      },
      components: [],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }

    const shifted = rescheduleProtocol(protocol, 1)
    if (shifted.schedule.recurrence.type === 'weekly') {
      expect(shifted.schedule.recurrence.weekdays).toEqual([1]) // Segunda
    }
  })
})
