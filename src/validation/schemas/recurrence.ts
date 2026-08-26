import { z } from 'zod'
import type { Recurrence, Schedule } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { isoWeekdaySchema, localDateSchema, localTimeSchema, timeZoneIdSchema } from './primitives'

// Schemas de recorrência e agendamento (§6, "Protocolos", "Recorrência").

export const recurrenceSchema: z.ZodType<Recurrence> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('single'),
  }),
  z.object({
    type: z.literal('weekly'),
    weekdays: z
      .array(isoWeekdaySchema)
      .min(1, { message: 'Selecione ao menos um dia da semana' })
      .max(7, { message: 'Máximo de 7 dias da semana' })
      .refine(
        (days) => {
          const sortedUnique = [...days]
            .sort((a, b) => a - b)
            .filter((d, i, arr) => i === 0 || arr[i - 1] !== d)
          return sortedUnique.length === days.length && days.every((d, i) => d === sortedUnique[i])
        },
        { message: 'Dias da semana devem ser únicos e ordenados de forma crescente' },
      ),
    weeks: z
      .number()
      .int({ message: 'A duração em semanas deve ser um número inteiro' })
      .min(1, { message: 'A duração em semanas deve ser de no mínimo 1' })
      .max(SAFETY_LIMITS.WEEKS_MAX, { message: `A duração em semanas deve ser de no máximo ${SAFETY_LIMITS.WEEKS_MAX}` }),
  }),
])

export const scheduleSchema: z.ZodType<Schedule> = z.object({
  startDate: localDateSchema,
  localTime: localTimeSchema,
  timeZone: timeZoneIdSchema,
  recurrence: recurrenceSchema,
})
