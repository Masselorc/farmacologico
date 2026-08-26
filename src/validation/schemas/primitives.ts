import { z } from 'zod'
import { isValidInstantIso, isValidLocalDate, isValidLocalTime, isValidTimeZoneId } from '../../domain/shared/datetime'
import type { DurationRange, DurationValue, InstantIso, IsoWeekday, LocalDate, LocalTime, MassUnit, TimeUnit, TimeZoneId } from '../../domain/types'
import { UX_LIMITS } from '../limits'

// Schemas primitivos reutilizáveis (§6, "Primitivos").

export const finiteNumberSchema = z.number().refine((n) => Number.isFinite(n), {
  message: 'Deve ser um número finito',
})

export const positiveFiniteNumberSchema = z.number().refine((n) => Number.isFinite(n) && n > 0, {
  message: 'Deve ser um número positivo maior que zero',
})

export const nonNegativeFiniteNumberSchema = z.number().refine((n) => Number.isFinite(n) && n >= 0, {
  message: 'Deve ser um número não negativo',
})

export const positiveIntegerSchema = z.number().int().positive()

export const nonEmptyStringSchema = z.string().min(1, { message: 'Texto não pode ser vazio' })

export const nameSchema = z
  .string()
  .min(1, { message: 'Nome é obrigatório' })
  .max(UX_LIMITS.NAME_MAX_CHARS, { message: `Nome deve ter no máximo ${UX_LIMITS.NAME_MAX_CHARS} caracteres` })
  .refine((s) => s.trim().length > 0, { message: 'Nome não pode ser vazio ou conter apenas espaços' })

export const instantIsoSchema: z.ZodType<InstantIso> = z
  .string()
  .refine(isValidInstantIso, { message: 'Data/hora ISO inválida' })

export const localDateSchema: z.ZodType<LocalDate> = z
  .string()
  .refine(isValidLocalDate, { message: 'Data civil inválida (formato YYYY-MM-DD)' })

export const localTimeSchema: z.ZodType<LocalTime> = z
  .string()
  .refine(isValidLocalTime, { message: 'Horário civil inválido (formato HH:MM)' })

export const timeZoneIdSchema: z.ZodType<TimeZoneId> = z
  .string()
  .refine(isValidTimeZoneId, { message: 'Identificador de fuso horário inválido' })

export const isoWeekdaySchema: z.ZodType<IsoWeekday> = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
])

export const massUnitSchema: z.ZodType<MassUnit> = z.enum(['mcg', 'mg', 'g'])

export const timeUnitSchema: z.ZodType<TimeUnit> = z.enum(['minutes', 'hours', 'days'])

export const durationValueSchema: z.ZodType<DurationValue> = z.object({
  value: positiveFiniteNumberSchema,
  unit: timeUnitSchema,
})

export const durationRangeSchema: z.ZodType<DurationRange> = z.object({
  min: durationValueSchema,
  max: durationValueSchema,
})
