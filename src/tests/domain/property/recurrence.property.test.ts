import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { civilToInstantIso, instantToZonedParts } from '../../../domain/shared/datetime'
import { generateOccurrences } from '../../../domain/recurrence/generate'
import { shiftSchedule } from '../../../domain/recurrence/shift'
import { validateRecurrence } from '../../../domain/recurrence/validate'
import type { IsoWeekday, Schedule } from '../../../domain/types'
import { bruteForceOccurrences, forAllSeeds, isoWeekdayOf } from './helpers'

const UTC = 'UTC'
const NY = 'America/New_York'

function utcMs(localDate: string, localTime = '09:00'): number {
  return instantToZonedParts({
    instantIso: civilToInstantIso({ localDate, localTime, timeZone: UTC }),
    timeZone: UTC,
  }).epochMilliseconds
}

function arbitrarySchedule(maxWeeks: number): fc.Arbitrary<Schedule> {
  return fc.record({
    startDate: fc
      .record({ y: fc.integer({ min: 2024, max: 2027 }), m: fc.integer({ min: 1, max: 12 }), d: fc.integer({ min: 1, max: 28 }) })
      .map(({ y, m, d }) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
    localTime: fc.constantFrom('06:00', '09:30', '12:00', '18:45'),
    timeZone: fc.constantFrom(UTC, NY, 'Europe/Lisbon', 'Asia/Tokyo'),
    recurrence: fc.oneof(
      fc.constant({ type: 'single' as const }),
      fc.record({
        type: fc.constant('weekly' as const),
        weekdays: fc
          .shuffledSubarray([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[], { minLength: 1, maxLength: 7 })
          .map((weekdays) => [...weekdays].sort((a, b) => a - b)),
        weeks: fc.integer({ min: 1, max: maxWeeks }),
      }),
    ),
  })
}

describe('E4 recurrence — propriedades estruturais vs oráculo brute-force', () => {
  it('saída ≡ brute-force do calendário completo: ordenada, sem duplicatas, dentro de [start,end)', () => {
    const property = fc.property(
      arbitrarySchedule(8),
      fc.integer({ min: 0, max: 60 }).chain((offsetDays) =>
        fc.record({
          startMs: fc.constant(utcMs('2024-01-01', '00:00') + offsetDays * 86_400_000),
          spanMs: fc.integer({ min: 1, max: 45 * 86_400_000 }),
        }),
      ),
      (schedule, window) => {
        const endMs = window.startMs + window.spanMs
        const got = generateOccurrences(schedule, window.startMs, endMs)
        const expected = bruteForceOccurrences(schedule, window.startMs, endMs)

        expect(got).toEqual(expected)
        expect(new Set(got.map((o) => o.instantMs)).size).toBe(got.length)
        for (const occurrence of got) {
          expect(occurrence.instantMs).toBeGreaterThanOrEqual(window.startMs)
          expect(occurrence.instantMs).toBeLessThan(endMs)
        }
        for (let i = 1; i < got.length; i++) {
          expect(got[i]!.instantMs).toBeGreaterThan(got[i - 1]!.instantMs)
        }
      },
    )
    forAllSeeds(property, { numRuns: 120 })
  }, 60_000)

  it('weekday de cada ocorrência pertence aos selecionados (verificação direta por instante)', () => {
    const schedule: Schedule = {
      startDate: '2026-03-02',
      localTime: '08:00',
      timeZone: NY,
      recurrence: { type: 'weekly', weekdays: [1, 5], weeks: 6 },
    }
    const start = utcMs('2026-03-01', '00:00')
    const end = utcMs('2026-04-15', '00:00')
    const occurrences = generateOccurrences(schedule, start, end)
    expect(occurrences.length).toBeGreaterThan(0)
    for (const occurrence of occurrences) {
      // Converte o instante de volta para o fuso do schedule e confere o dia da semana.
      const instantIso = civilToInstantIso({
        localDate: occurrence.scheduleLocalDate,
        localTime: schedule.localTime,
        timeZone: schedule.timeZone,
      })
      expect(
        instantToZonedParts({ instantIso, timeZone: schedule.timeZone }).localDate,
      ).toBe(occurrence.scheduleLocalDate)
      expect([1, 5]).toContain(isoWeekdayOf(occurrence.scheduleLocalDate))
    }
  })

  it('concatenação: g(a,b)+g(b,c) ≡ g(a,c), inclusive atravessando DST', () => {
    const property = fc.property(
      arbitrarySchedule(10),
      fc.integer({ min: 0, max: 40 }),
      fc.integer({ min: 1, max: 20 * 86_400_000 }),
      fc.integer({ min: 1, max: 20 * 86_400_000 }),
      (schedule, offsetDays, spanAB, spanBC) => {
        const a = utcMs('2024-02-15', '00:00') + offsetDays * 86_400_000 // cobre março (DST gap NY)
        const b = a + spanAB
        const c = b + spanBC

        const whole = generateOccurrences(schedule, a, c)
        const left = generateOccurrences(schedule, a, b)
        const right = generateOccurrences(schedule, b, c)

        expect([...left, ...right]).toEqual(whole)
      },
    )
    forAllSeeds(property, { numRuns: 150 })
  })

  it('janela pequena sobre vigência longa permanece proporcional (estrutural)', () => {
    const longSchedule: Schedule = {
      startDate: '2026-01-05',
      localTime: '07:00',
      timeZone: UTC,
      recurrence: { type: 'weekly', weekdays: [2], weeks: 520 },
    }
    const start = utcMs('2031-06-04', '00:00')
    const oneDayWindow = generateOccurrences(longSchedule, start, start + 86_400_000)
    expect(oneDayWindow.length).toBeLessThanOrEqual(1)
  })
})

describe('E4 shiftSchedule — propriedades civis', () => {
  it('shift(shift(s,d),−d) recupera o schedule original; ±1/±7 rotacionam conforme ISO', () => {
    const property = fc.property(
      arbitrarySchedule(520),
      fc.integer({ min: -3650, max: 3650 }),
      (schedule, delta) => {
        const shifted = shiftSchedule(schedule, delta)
        const restored = shiftSchedule(shifted, -delta)
        expect(restored).toEqual(schedule)

        // Rotação weekday: shift +7 preserva weekdays.
        if (schedule.recurrence.type === 'weekly' && delta % 7 === 0) {
          expect(shifted.recurrence).toEqual(schedule.recurrence)
        }
      },
    )
    forAllSeeds(property, { numRuns: 200 })

    const weekly: Schedule = {
      startDate: '2026-05-04', // segunda-feira
      localTime: '08:00',
      timeZone: UTC,
      recurrence: { type: 'weekly', weekdays: [1], weeks: 4 },
    }
    expect(shiftSchedule(weekly, 1).recurrence).toEqual({ type: 'weekly', weekdays: [2], weeks: 4 })
    expect(shiftSchedule(weekly, -1).recurrence).toEqual({ type: 'weekly', weekdays: [7], weeks: 4 })
    expect(shiftSchedule(weekly, -1).startDate).toBe('2026-05-03')
    expect(shiftSchedule(weekly, 7).startDate).toBe('2026-05-11')
  })

  it('deslocamento civil NÃO é deslocamento de milissegundos (DST muda o instante)', () => {
    // NY: semana contendo 2024-03-10 (gap). +7 dias civis ⇒ mesmo horário civil,
    // mas os INSTANTES diferem em 167 h (não 168 h) por causa do DST.
    const schedule: Schedule = {
      startDate: '2024-03-06',
      localTime: '12:00',
      timeZone: NY,
      recurrence: { type: 'single' },
    }
    const before = generateOccurrences(schedule, 0, Number.MAX_SAFE_INTEGER)[0]!.instantMs
    const after = generateOccurrences(shiftSchedule(schedule, 7), 0, Number.MAX_SAFE_INTEGER)[0]!.instantMs
    expect(after - before).toBe((7 * 24 - 1) * 3_600_000)
  })
})

describe('E4 validateRecurrence — fronteiras', () => {
  it('aceita exatamente inteiros 1..520 e weekdays 1..7 canônicos; rejeita o resto', () => {
    expect(validateRecurrence({ type: 'weekly', weekdays: [1, 2, 3, 4, 5, 6, 7], weeks: 1 }).ok).toBe(true)
    expect(validateRecurrence({ type: 'weekly', weekdays: [7], weeks: 520 }).ok).toBe(true)
    for (const weeks of [0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 521]) {
      expect(validateRecurrence({ type: 'weekly', weekdays: [1], weeks }).ok).toBe(false)
    }
    for (const weekdays of [[], [0], [8], [Number.NaN], [Infinity], [3, 1], [1, 1]] as never[][]) {
      expect(validateRecurrence({ type: 'weekly', weekdays, weeks: 4 }).ok).toBe(false)
    }
  })

  it('fixtures DST obrigatórias na recorrência: GAP later e OVERLAP earlier', () => {
    const gapSchedule: Schedule = {
      startDate: '2024-03-10',
      localTime: '02:30',
      timeZone: NY,
      recurrence: { type: 'single' },
    }
    const gapOccurrence = generateOccurrences(gapSchedule, 0, Number.MAX_SAFE_INTEGER)[0]!
    const expectedGap = instantToZonedParts({
      instantIso: civilToInstantIso({ localDate: '2024-03-10', localTime: '02:30', timeZone: NY }),
      timeZone: NY,
    })
    expect(gapOccurrence.instantMs).toBe(expectedGap.epochMilliseconds)
    expect(expectedGap.localTime).toBe('03:30')

    const overlapSchedule: Schedule = {
      ...gapSchedule,
      startDate: '2024-11-03',
      localTime: '01:30',
    }
    const overlapOccurrence = generateOccurrences(overlapSchedule, 0, Number.MAX_SAFE_INTEGER)[0]!
    const expectedOverlap = instantToZonedParts({
      instantIso: civilToInstantIso({ localDate: '2024-11-03', localTime: '01:30', timeZone: NY }),
      timeZone: NY,
    })
    expect(overlapOccurrence.instantMs).toBe(expectedOverlap.epochMilliseconds)
    expect(expectedOverlap.offset).toBe('-04:00')
  })
})
