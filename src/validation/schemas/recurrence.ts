import { z } from 'zod'
import { validationMessages } from '../../app/i18n/pt-BR.messages'
import type { Recurrence, Schedule } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { isoWeekdaySchema, localDateSchema, localTimeSchema, timeZoneIdSchema } from './primitives'

// Schemas de recorrência e agendamento (§6, "Protocolos", "Recorrência").

export const recurrenceSchema: z.ZodType<Recurrence> = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('single'),
  }),
  z.strictObject({
    type: z.literal('weekly'),
    weekdays: z
      .array(isoWeekdaySchema)
      .min(1, { message: validationMessages.weekdaysEmpty })
      .max(7, { message: validationMessages.weekdaysMax })
      .refine(
        (days) => {
          const sortedUnique = [...days]
            .sort((a, b) => a - b)
            .filter((d, i, arr) => i === 0 || arr[i - 1] !== d)
          return sortedUnique.length === days.length && days.every((d, i) => d === sortedUnique[i])
        },
        { message: validationMessages.weekdaysCanonical },
      ),
    weeks: z
      .number()
      .int({ message: validationMessages.weeksInteger })
      .min(1, { message: validationMessages.weeksMin })
      .max(SAFETY_LIMITS.WEEKS_MAX, { message: validationMessages.weeksMax(SAFETY_LIMITS.WEEKS_MAX) }),
  }),
])

export const scheduleSchema: z.ZodType<Schedule> = z.strictObject({
  startDate: localDateSchema,
  localTime: localTimeSchema,
  timeZone: timeZoneIdSchema,
  recurrence: recurrenceSchema,
})
