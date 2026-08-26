import { describe, expect, it } from 'vitest'
import { civilToInstantIso, instantToZonedParts } from '../../domain/shared/datetime'
import { generateOccurrences } from '../../domain/recurrence/generate'
import { shiftSchedule } from '../../domain/recurrence/shift'
import { validateRecurrence } from '../../domain/recurrence/validate'
import type { Schedule } from '../../domain/types'

const UTC = 'UTC'
const NY = 'America/New_York'
const ONE_DAY_MS = 86_400_000

function utcMs(localDate: string, localTime: string): number {
  const iso = civilToInstantIso({ localDate, localTime, timeZone: UTC })
  return instantToZonedParts({ instantIso: iso, timeZone: UTC }).epochMilliseconds
}

const weeklyMonWedFri: Schedule = {
  startDate: '2026-01-05',
  localTime: '09:00',
  timeZone: UTC,
  recurrence: { type: 'weekly', weekdays: [1, 3, 5], weeks: 2 },
}

describe('validateRecurrence', () => {
  it('single é válido', () => {
    expect(validateRecurrence({ type: 'single' })).toEqual({ ok: true })
  })

  it('weekly canônico é válido', () => {
    expect(validateRecurrence(weeklyMonWedFri.recurrence)).toEqual({ ok: true })
  })

  it('weeks deve ser inteiro 1..520', () => {
    for (const weeks of [0, -1, 2.5, Number.NaN, 521]) {
      const result = validateRecurrence({ type: 'weekly', weekdays: [1], weeks })
      expect(result.ok).toBe(false)
    }
    expect(validateRecurrence({ type: 'weekly', weekdays: [7], weeks: 520 }).ok).toBe(true)
  })

  it('weekdays exigem não vazio, 1..7 e ordem ascendente sem duplicatas', () => {
    expect(validateRecurrence({ type: 'weekly', weekdays: [], weeks: 4 }).ok).toBe(false)
    expect(validateRecurrence({ type: 'weekly', weekdays: [0, 3] as never[], weeks: 4 }).ok).toBe(false)
    expect(validateRecurrence({ type: 'weekly', weekdays: [8] as never[], weeks: 4 }).ok).toBe(false)
    expect(validateRecurrence({ type: 'weekly', weekdays: [3, 1], weeks: 4 }).ok).toBe(false)
    expect(validateRecurrence({ type: 'weekly', weekdays: [1, 1, 3], weeks: 4 }).ok).toBe(false)
  })
})

describe('generateOccurrences — single', () => {
  const schedule: Schedule = {
    startDate: '2026-01-05',
    localTime: '10:00',
    timeZone: UTC,
    recurrence: { type: 'single' },
  }
  const instantMs = utcMs('2026-01-05', '10:00')

  it('ocorrência dentro da janela semiaberta', () => {
    const got = generateOccurrences(schedule, instantMs - 60_000, instantMs + 60_000)
    expect(got).toEqual([{ instantMs, scheduleLocalDate: '2026-01-05' }])
  })

  it('fronteira: exatamente no start incluída; exatamente no end EXCLUÍDA', () => {
    expect(generateOccurrences(schedule, instantMs, instantMs + 1)[0]).toBeDefined()
    expect(generateOccurrences(schedule, instantMs - 1, instantMs)).toEqual([])
  })

  it('fora da janela ⇒ vazio', () => {
    expect(generateOccurrences(schedule, instantMs + 1, instantMs + 2)).toEqual([])
  })

  it('limites inválidos rejeitados (finitos e start<end)', () => {
    expect(() => generateOccurrences(schedule, 10, 10)).toThrowError(RangeError)
    expect(() => generateOccurrences(schedule, Number.NaN, 20)).toThrowError(RangeError)
  })
})

describe('generateOccurrences — weekly', () => {
  it('gera somente weekdays selecionados na vigência civil, ascendente', () => {
    const start = utcMs('2026-01-01', '00:00')
    const end = utcMs('2026-01-20', '00:00')
    const got = generateOccurrences(weeklyMonWedFri, start, end)

    // 2026-01-05 é segunda-feira ISO (dayOfWeek=1)
    expect(got.map((o) => o.instantMs)).toEqual([
      utcMs('2026-01-05', '09:00'),
      utcMs('2026-01-07', '09:00'),
      utcMs('2026-01-09', '09:00'),
      utcMs('2026-01-12', '09:00'),
      utcMs('2026-01-14', '09:00'),
      utcMs('2026-01-16', '09:00'),
    ])
    expect(got.every((o) => o.scheduleLocalDate.length === 10)).toBe(true)
  })

  it('vigência civil inclusiva: término = startDate + (weeks·7 − 1) dias', () => {
    const start = utcMs('2026-01-16', '00:00')
    const end = utcMs('2026-01-19', '00:00')
    // weeks=2 termina em 2026-01-18 (domingo); sexta 16/01 está dentro, dia 19 não
    const got = generateOccurrences(weeklyMonWedFri, start, end)
    expect(got.map((o) => o.scheduleLocalDate)).toEqual(['2026-01-16'])
  })

  it('janelas adjacentes concatenam sem duplicar nem perder fronteira', () => {
    const a = utcMs('2026-01-07', '00:00')
    const b = utcMs('2026-01-14', '09:00')
    const c = utcMs('2026-01-17', '00:00')
    const left = generateOccurrences(weeklyMonWedFri, a, b)
    const right = generateOccurrences(weeklyMonWedFri, b, c)
    const whole = generateOccurrences(weeklyMonWedFri, a, c)

    const concatenated = [...left, ...right]
    expect(concatenated).toEqual(whole)
    const instants = concatenated.map((o) => o.instantMs)
    expect(new Set(instants).size).toBe(instants.length)
  })

  it('janela pequena sobre protocolo longo permanece proporcional (não materializa horizonte)', () => {
    const longSchedule: Schedule = {
      startDate: '2026-01-05',
      localTime: '06:00',
      timeZone: UTC,
      recurrence: { type: 'weekly', weekdays: [1], weeks: 520 },
    }
    const start = utcMs('2030-06-03', '00:00')
    const got = generateOccurrences(longSchedule, start, start + ONE_DAY_MS)
    expect(got.length).toBeLessThanOrEqual(1)
  })
})

describe('shiftSchedule — deslocamento CIVIL', () => {
  it('+1 dia desloca startDate e rotaciona weekdays (seg→ter)', () => {
    const shifted = shiftSchedule(weeklyMonWedFri, 1)
    expect(shifted.startDate).toBe('2026-01-06')
    expect(shifted.recurrence).toEqual({ type: 'weekly', weekdays: [2, 4, 6], weeks: 2 })
    expect(shifted.localTime).toBe('09:00')
    expect(shifted.timeZone).toBe(UTC)
  })

  it('-1 dia rotaciona para trás com módulo não negativo (seg→dom)', () => {
    const shifted = shiftSchedule(weeklyMonWedFri, -1)
    expect(shifted.startDate).toBe('2026-01-04')
    expect(shifted.recurrence).toEqual({ type: 'weekly', weekdays: [2, 4, 7], weeks: 2 })
  })

  it('preserva ordenação ascendente dos weekdays na rotação ISO (ex: [1,7]+1⇒[1,2], [1,6,7]+1⇒[1,2,7])', () => {
    const scheduleA: Schedule = {
      startDate: '2026-01-05',
      localTime: '10:00',
      timeZone: UTC,
      recurrence: { type: 'weekly', weekdays: [1, 7], weeks: 2 },
    }
    const shiftedA = shiftSchedule(scheduleA, 1)
    expect(shiftedA.recurrence).toEqual({ type: 'weekly', weekdays: [1, 2], weeks: 2 })

    const scheduleB: Schedule = {
      startDate: '2026-01-05',
      localTime: '10:00',
      timeZone: UTC,
      recurrence: { type: 'weekly', weekdays: [1, 6, 7], weeks: 2 },
    }
    const shiftedB = shiftSchedule(scheduleB, 1)
    expect(shiftedB.recurrence).toEqual({ type: 'weekly', weekdays: [1, 2, 7], weeks: 2 })
  })

  it('+7 dias preserva os weekdays; original NUNCA mutado; delta fracionário rejeitado', () => {
    const snapshot = JSON.stringify(weeklyMonWedFri)
    const shifted = shiftSchedule(weeklyMonWedFri, 7)
    expect(shifted.startDate).toBe('2026-01-12')
    expect(shifted.recurrence).toEqual(weeklyMonWedFri.recurrence)
    expect(JSON.stringify(weeklyMonWedFri)).toBe(snapshot)

    expect(() => shiftSchedule(weeklyMonWedFri, 0.5)).toThrowError(RangeError)
  })

  it('single preserva tipo', () => {
    const single: Schedule = { startDate: '2026-02-01', localTime: '08:30', timeZone: UTC, recurrence: { type: 'single' } }
    expect(shiftSchedule(single, -3).recurrence).toEqual({ type: 'single' })
    expect(shiftSchedule(single, -3).startDate).toBe('2026-01-29')
  })
})

describe('DST usa a camada Temporal da E2 (GAP later / OVERLAP earlier)', () => {
  it('GAP: New York 2024-03-10 02:30 → instante do horário resolvido 03:30 (single)', () => {
    const schedule: Schedule = {
      startDate: '2024-03-10',
      localTime: '02:30',
      timeZone: NY,
      recurrence: { type: 'single' },
    }
    const expectedIso = civilToInstantIso({ localDate: '2024-03-10', localTime: '02:30', timeZone: NY })
    const got = generateOccurrences(schedule, 0, Number.MAX_SAFE_INTEGER)
    expect(got.length).toBe(1)
    expect(got[0]!.instantMs).toBe(instantToZonedParts({ instantIso: expectedIso, timeZone: NY }).epochMilliseconds)
    expect(instantToZonedParts({ instantIso: expectedIso, timeZone: NY }).localTime).toBe('03:30')
  })

  it('GAP: New York 2024-03-10 02:30 em recorrência WEEKLY atravessando a transição', () => {
    const schedule: Schedule = {
      startDate: '2024-03-03', // domingo anterior ao GAP
      localTime: '02:30',
      timeZone: NY,
      recurrence: { type: 'weekly', weekdays: [7], weeks: 3 }, // 3 domingos: 03/03, 10/03 (GAP), 17/03
    }
    const start = utcMs('2024-03-01', '00:00')
    const end = utcMs('2024-03-25', '00:00')
    const got = generateOccurrences(schedule, start, end)
    expect(got.length).toBe(3)

    const gapOcc = got.find((o) => o.scheduleLocalDate === '2024-03-10')
    expect(gapOcc).toBeDefined()

    const expectedIso = civilToInstantIso({ localDate: '2024-03-10', localTime: '02:30', timeZone: NY })
    const parts = instantToZonedParts({ instantIso: expectedIso, timeZone: NY })
    expect(gapOcc!.instantMs).toBe(parts.epochMilliseconds)
    expect(parts.localDate).toBe('2024-03-10')
    expect(parts.localTime).toBe('03:30')
    expect(parts.offset).toBe('-04:00')
  })

  it('OVERLAP: New York 2024-11-03 01:30 → primeira ocorrência (-04:00) (single)', () => {
    const schedule: Schedule = {
      startDate: '2024-11-03',
      localTime: '01:30',
      timeZone: NY,
      recurrence: { type: 'single' },
    }
    const start = utcMs('2024-11-01', '00:00')
    const end = utcMs('2024-11-10', '00:00')
    const got = generateOccurrences(schedule, start, end)
    expect(got.length).toBe(1)
    const parts = instantToZonedParts({
      instantIso: civilToInstantIso({ localDate: '2024-11-03', localTime: '01:30', timeZone: NY }),
      timeZone: NY,
    })
    expect(got[0]!.instantMs).toBe(parts.epochMilliseconds)
    expect(parts.offset).toBe('-04:00')
  })

  it('OVERLAP: New York 2024-11-03 01:30 em recorrência WEEKLY atravessando a transição', () => {
    const schedule: Schedule = {
      startDate: '2024-10-27', // domingo anterior ao OVERLAP
      localTime: '01:30',
      timeZone: NY,
      recurrence: { type: 'weekly', weekdays: [7], weeks: 3 }, // 3 domingos: 27/10, 03/11 (OVERLAP), 10/11
    }
    const start = utcMs('2024-10-20', '00:00')
    const end = utcMs('2024-11-15', '00:00')
    const got = generateOccurrences(schedule, start, end)
    expect(got.length).toBe(3)

    const overlapOcc = got.find((o) => o.scheduleLocalDate === '2024-11-03')
    expect(overlapOcc).toBeDefined()

    const parts = instantToZonedParts({
      instantIso: civilToInstantIso({ localDate: '2024-11-03', localTime: '01:30', timeZone: NY }),
      timeZone: NY,
    })
    expect(overlapOcc!.instantMs).toBe(parts.epochMilliseconds)
    expect(parts.localDate).toBe('2024-11-03')
    expect(parts.localTime).toBe('01:30')
    expect(parts.offset).toBe('-04:00')
  })

  it('schedule com fuso inválido rejeitado de forma determinística', () => {
    expect(() =>
      generateOccurrences(
        { startDate: '2026-01-05', localTime: '10:00', timeZone: 'Marte/Base', recurrence: { type: 'single' } },
        0,
        100,
      ),
    ).toThrowError(RangeError)
  })
})
