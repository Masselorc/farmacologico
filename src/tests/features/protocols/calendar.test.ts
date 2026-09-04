import { describe, expect, it } from 'vitest'
import {
  buildAgendaDays,
  buildMonthCells,
  buildWeekCells,
  collectWindowOccurrences,
  deriveViewDisplayWindow,
  navigatePeriod,
  occurrenceToZonedPlacement,
} from '../../../features/protocols/lib/calendar'
import type { Protocol } from '../../../domain/types'

describe('protocols/lib/calendar', () => {
  const timeZone = 'America/Sao_Paulo'
  const anchorDate = '2026-09-04' // Uma sexta-feira

  it('deriveViewDisplayWindow para mês inicia na segunda-feira anterior e termina no domingo posterior exclusivo', () => {
    const window = deriveViewDisplayWindow('month', anchorDate, timeZone)
    expect(window.startMs).toBeLessThan(window.endMs)

    // Setembro de 2026 começa na terça-feira (01/09/2026), logo a segunda anterior é 31/08/2026
    const startPlacement = occurrenceToZonedPlacement(window.startMs, timeZone)
    expect(startPlacement.localDate).toBe('2026-08-31')
    expect(startPlacement.localTime).toBe('00:00')

    // Setembro de 2026 termina na quarta-feira (30/09/2026), logo o domingo posterior é 04/10/2026 e o exclusivo é 05/10/2026
    const endPlacement = occurrenceToZonedPlacement(window.endMs, timeZone)
    expect(endPlacement.localDate).toBe('2026-10-05')
    expect(endPlacement.localTime).toBe('00:00')
  })

  it('deriveViewDisplayWindow para semana cobre de segunda-feira a próximo domingo inclusive', () => {
    const window = deriveViewDisplayWindow('week', anchorDate, timeZone)
    const start = occurrenceToZonedPlacement(window.startMs, timeZone)
    const end = occurrenceToZonedPlacement(window.endMs, timeZone)

    expect(start.localDate).toBe('2026-08-31') // Segunda-feira
    expect(end.localDate).toBe('2026-09-07') // Próxima segunda-feira exclusiva
  })

  it('buildMonthCells constrói grade de 7 colunas iniciando em segunda-feira (ISO 1)', () => {
    const cells = buildMonthCells(anchorDate, timeZone, '2026-09-04')
    expect(cells.length % 7).toBe(0)
    expect(cells[0]!.dayOfWeek).toBe(1) // Segunda
    expect(cells[cells.length - 1]!.dayOfWeek).toBe(7) // Domingo

    // Célula hoje
    const todayCell = cells.find((c) => c.isToday)
    expect(todayCell).toBeDefined()
    expect(todayCell?.localDate).toBe('2026-09-04')
    expect(todayCell?.isCurrentMonth).toBe(true)

    // Célula do mês anterior
    const augCell = cells.find((c) => c.localDate === '2026-08-31')
    expect(augCell).toBeDefined()
    expect(augCell?.isCurrentMonth).toBe(false)
  })

  it('buildWeekCells constrói exatamente 7 dias começando na segunda', () => {
    const cells = buildWeekCells(anchorDate, timeZone, '2026-09-04')
    expect(cells).toHaveLength(7)
    expect(cells[0]!.localDate).toBe('2026-08-31')
    expect(cells[0]!.dayOfWeek).toBe(1)
    expect(cells[6]!.localDate).toBe('2026-09-06')
    expect(cells[6]!.dayOfWeek).toBe(7)
  })

  it('buildAgendaDays gera quantidade solicitada de dias consecutivos', () => {
    const cells = buildAgendaDays(anchorDate, 10, timeZone, '2026-09-04')
    expect(cells).toHaveLength(10)
    expect(cells[0]!.localDate).toBe('2026-09-04')
    expect(cells[9]!.localDate).toBe('2026-09-13')
  })

  it('navigatePeriod avança e retrocede conforme o modo', () => {
    expect(navigatePeriod('2026-09-04', 'month', 1)).toBe('2026-10-04')
    expect(navigatePeriod('2026-09-04', 'month', -1)).toBe('2026-08-04')
    expect(navigatePeriod('2026-09-04', 'week', 1)).toBe('2026-09-11')
    expect(navigatePeriod('2026-09-04', 'week', -1)).toBe('2026-08-28')
  })

  it('collectWindowOccurrences coleta e posiciona administrações no fuso especificado', () => {
    const protocol: Protocol = {
      id: 'proto-1',
      name: 'Enantato Semanal',
      totalDoseMg: 250,
      schedule: {
        startDate: '2026-09-01',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: {
          type: 'weekly',
          weekdays: [1], // Segundas
          weeks: 4,
        },
      },
      components: [
        {
          id: 'comp-1',
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
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }

    const window = deriveViewDisplayWindow('month', anchorDate, timeZone)
    const occurrences = collectWindowOccurrences([protocol], window, timeZone)

    expect(occurrences.length).toBeGreaterThan(0)
    for (const occ of occurrences) {
      expect(occ.protocol.id).toBe('proto-1')
      expect(occ.localTime).toBe('08:00')
    }
  })
})
