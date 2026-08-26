import { SAFETY_LIMITS } from '../../validation/limits'
import { isValidLocalDate, isValidLocalTime, isValidTimeZoneId } from '../shared/datetime'
import type { IsoWeekday, Recurrence, Schedule } from '../types'

// Validação de forma do motor (E5 fará o schema Zod completo e o catálogo pt-BR).
// Motivos estruturais locais — NÃO são DomainErrorCode normativos.

export type RecurrenceInvalidReason =
  | 'INVALID_START_DATE'
  | 'INVALID_LOCAL_TIME'
  | 'INVALID_TIME_ZONE'
  | 'EMPTY_WEEKDAYS'
  | 'WEEKDAY_OUT_OF_RANGE'
  | 'WEEKDAYS_NOT_ASCENDING_UNIQUE'
  | 'WEEKS_NOT_INTEGER'
  | 'WEEKS_OUT_OF_RANGE'

export type RecurrenceValidation =
  | { ok: true }
  | { ok: false; reasons: RecurrenceInvalidReason[] }

export function validateRecurrence(recurrence: Recurrence): RecurrenceValidation {
  if (recurrence.type === 'single') {
    return { ok: true }
  }

  const reasons: RecurrenceInvalidReason[] = []
  const { weekdays, weeks } = recurrence

  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    reasons.push('EMPTY_WEEKDAYS')
  } else {
    let outOfRange = false
    for (const day of weekdays) {
      if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 7) {
        outOfRange = true
        break
      }
    }
    if (outOfRange) {
      reasons.push('WEEKDAY_OUT_OF_RANGE')
    }
    const sortedUnique = [...weekdays].sort((a, b) => a - b)
    const canonical = sortedUnique.filter((d, i) => i === 0 || sortedUnique[i - 1] !== d)
    if (
      canonical.length !== weekdays.length ||
      weekdays.some((d, i) => d !== canonical[i])
    ) {
      reasons.push('WEEKDAYS_NOT_ASCENDING_UNIQUE')
    }
  }

  if (!Number.isInteger(weeks)) {
    reasons.push('WEEKS_NOT_INTEGER')
  } else if ((weeks as number) < 1 || (weeks as number) > SAFETY_LIMITS.WEEKS_MAX) {
    reasons.push('WEEKS_OUT_OF_RANGE')
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons }
}

/** Validação de forma do Schedule (civil/fuso via camada Temporal E2). */
export function validateScheduleShape(schedule: Schedule): RecurrenceValidation {
  const reasons: RecurrenceInvalidReason[] = []
  if (!isValidLocalDate(schedule.startDate)) {
    reasons.push('INVALID_START_DATE')
  }
  if (!isValidLocalTime(schedule.localTime)) {
    reasons.push('INVALID_LOCAL_TIME')
  }
  if (!isValidTimeZoneId(schedule.timeZone)) {
    reasons.push('INVALID_TIME_ZONE')
  }
  const recurrenceCheck = validateRecurrence(schedule.recurrence)
  if (!recurrenceCheck.ok) {
    reasons.push(...recurrenceCheck.reasons)
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons }
}

export type { IsoWeekday }
