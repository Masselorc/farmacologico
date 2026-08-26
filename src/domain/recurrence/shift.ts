import { Temporal } from '@js-temporal/polyfill'
import type { Schedule } from '../types'

// shiftSchedule(schedule, deltaDays) — deslocamento CIVIL (§4):
// startDate += deltaDays; localTime/timeZone preservados;
// rotação semanal ISO rotate(d) = 1 + mod((d−1)+deltaDays, 7), módulo não negativo.
// PROIBIDO deslocar somando deltaDays·86_400_000 ao instante.

export function shiftSchedule(schedule: Schedule, deltaDays: number): Schedule {
  if (!Number.isInteger(deltaDays)) {
    throw new RangeError('shiftSchedule: deltaDays deve ser inteiro')
  }

  const shiftedStartDate = Temporal.PlainDate.from(schedule.startDate).add({ days: deltaDays })

  const recurrence =
    schedule.recurrence.type === 'single'
      ? schedule.recurrence
      : {
          type: 'weekly' as const,
          weekdays: schedule.recurrence.weekdays
            .map((day) => (1 + (((day - 1 + deltaDays) % 7) + 7) % 7) as typeof day)
            .sort((a, b) => a - b),
          weeks: schedule.recurrence.weeks,
        }

  return {
    ...schedule,
    startDate: shiftedStartDate.toString(),
    recurrence,
  }
}
