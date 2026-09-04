import { Temporal } from '@js-temporal/polyfill'
import { shiftSchedule } from '../../../domain/recurrence/shift'
import type { LocalDate, Protocol, Schedule } from '../../../domain/types'

export const DRAG_THRESHOLD_PX = 7
export const CLICK_SUPPRESSION_MS = 800
export const UNDO_AUTO_DISMISS_MS = 7000

export interface UndoMovementState {
  protocolId: string
  protocolName: string
  previousSchedule: Schedule
  newSchedule: Schedule
}

export function computeCivilDayDelta(
  sourceLocalDateStr: LocalDate,
  targetLocalDateStr: LocalDate,
): number {
  const source = Temporal.PlainDate.from(sourceLocalDateStr)
  const target = Temporal.PlainDate.from(targetLocalDateStr)
  return target.since(source).days
}

export function rescheduleProtocol(
  protocol: Protocol,
  deltaDays: number,
  newUpdatedAtIso?: string,
): Protocol {
  const shiftedSchedule = shiftSchedule(protocol.schedule, deltaDays)
  return {
    ...protocol,
    schedule: shiftedSchedule,
    updatedAt: newUpdatedAtIso ?? new Date().toISOString(),
  }
}
