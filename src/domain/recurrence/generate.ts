import { Temporal } from '@js-temporal/polyfill'
import { civilToInstantIso, instantToZonedParts } from '../shared/datetime'
import type { IsoWeekday, Occurrence, Schedule } from '../types'
import { validateScheduleShape } from './validate'

// generateOccurrences(schedule, rangeStartMs, rangeEndMs) — janela SEMIABERTA
// [rangeStartMs, rangeEndMs) (§4). Objetos ∝ janela pedida; nunca materializa horizonte.

export interface RangeArgs {
  rangeStartMs: number
  rangeEndMs: number
}

function assertRange({ rangeStartMs, rangeEndMs }: RangeArgs): void {
  if (!Number.isFinite(rangeStartMs) || !Number.isFinite(rangeEndMs)) {
    throw new RangeError('generateOccurrences: limites devem ser finitos')
  }
  if (rangeStartMs >= rangeEndMs) {
    throw new RangeError('generateOccurrences: exige rangeStartMs < rangeEndMs')
  }
}

/** Converte ms → data civil no fuso (camada E2; sem timezone do host). */
function epochMsToCivilDate(instantMs: number, timeZone: string): Temporal.PlainDate {
  const parts = instantToZonedParts({
    instantIso: Temporal.Instant.fromEpochMilliseconds(instantMs).toString(),
    timeZone,
  })
  return Temporal.PlainDate.from(parts.localDate)
}

function occurrenceAt(schedule: Schedule, date: Temporal.PlainDate): { instantMs: number; scheduleLocalDate: Schedule['startDate'] } {
  const instantIso = civilToInstantIso({
    localDate: date.toString(),
    localTime: schedule.localTime,
    timeZone: schedule.timeZone,
  })
  const { epochMilliseconds } = instantToZonedParts({ instantIso, timeZone: schedule.timeZone })
  return { instantMs: epochMilliseconds, scheduleLocalDate: date.toString() }
}

/**
 * Ocorrências com rangeStartMs ≤ instantMs < rangeEndMs, ascendente, sem duplicatas.
 * GAP/OVERLAP seguem a política da camada E2 ('later'/'earlier').
 * Janelas adjacentes concatenam sem duplicar nem perder a fronteira.
 */
export function generateOccurrences(
  schedule: Schedule,
  rangeStartMs: number,
  rangeEndMs: number,
): Occurrence[] {
  assertRange({ rangeStartMs, rangeEndMs })

  const shapeCheck = validateScheduleShape(schedule)
  if (!shapeCheck.ok) {
    throw new RangeError(`generateOccurrences: schedule inválido (${shapeCheck.reasons.join(', ')})`)
  }

  const startDate = Temporal.PlainDate.from(schedule.startDate)

  if (schedule.recurrence.type === 'single') {
    const occurrence = occurrenceAt(schedule, startDate)
    if (occurrence.instantMs >= rangeStartMs && occurrence.instantMs < rangeEndMs) {
      return [occurrence]
    }
    return []
  }

  // weekly — vigência civil INCLUSIVA: startDate + (weeks·7 − 1) dias.
  const endDate = startDate.add({ days: schedule.recurrence.weeks * 7 - 1 })
  const selectedWeekdays = new Set<number>(schedule.recurrence.weekdays as ReadonlyArray<number>)

  // Iteração proporcional à janela: margens de ±2 dias civis cobrem localTime/DST.
  const windowStartCivil = maxDate(
    startDate,
    epochMsToCivilDate(rangeStartMs, schedule.timeZone).subtract({ days: 2 }),
  )
  const windowEndCivil = minDate(
    endDate,
    epochMsToCivilDate(rangeEndMs, schedule.timeZone).add({ days: 2 }),
  )

  const occurrences: Occurrence[] = []
  const seenInstants = new Set<number>()

  if (Temporal.PlainDate.compare(windowEndCivil, windowStartCivil) < 0) {
    return []
  }

  for (let date = windowStartCivil; Temporal.PlainDate.compare(date, windowEndCivil) <= 0; date = date.add({ days: 1 })) {
    if (!selectedWeekdays.has(date.dayOfWeek)) {
      continue
    }
    const occurrence = occurrenceAt(schedule, date)
    if (occurrence.instantMs < rangeStartMs || occurrence.instantMs >= rangeEndMs) {
      continue
    }
    if (!seenInstants.has(occurrence.instantMs)) {
      seenInstants.add(occurrence.instantMs)
      occurrences.push(occurrence)
    }
  }

  occurrences.sort((a, b) => a.instantMs - b.instantMs)
  return occurrences
}

function maxDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
  return Temporal.PlainDate.compare(a, b) >= 0 ? a : b
}

function minDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
  return Temporal.PlainDate.compare(a, b) <= 0 ? a : b
}

export type { IsoWeekday }
