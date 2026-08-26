import { z } from 'zod'
import { validationMessages } from '../../app/i18n/pt-BR.messages'
import { isValidInstantIso, isValidLocalDate, isValidLocalTime, isValidTimeZoneId } from '../../domain/shared/datetime'
import type {
  DisplayColor,
  DurationRange,
  DurationValue,
  InstantIso,
  IsoWeekday,
  LocalDate,
  LocalTime,
  MassUnit,
  PaletteColorId,
  TimeUnit,
  TimeZoneId,
} from '../../domain/types'
import { compareDurationValues } from '../../domain/units/convert'
import { UX_LIMITS } from '../limits'

// Schemas primitivos reutilizáveis (§6, "Primitivos").

export const finiteNumberSchema = z.number().refine((n) => Number.isFinite(n), {
  message: validationMessages.finiteNumber,
})

export const positiveFiniteNumberSchema = z.number().refine((n) => Number.isFinite(n) && n > 0, {
  message: validationMessages.positiveFiniteNumber,
})

export const nonNegativeFiniteNumberSchema = z.number().refine((n) => Number.isFinite(n) && n >= 0, {
  message: validationMessages.nonNegativeFiniteNumber,
})

export const positiveIntegerSchema = z.number().int().positive({ message: validationMessages.positiveInteger })

export const nonEmptyStringSchema = z.string().min(1, { message: validationMessages.nonEmptyText })

export const nameSchema = z
  .string()
  .min(1, { message: validationMessages.nameRequired })
  .max(UX_LIMITS.NAME_MAX_CHARS, { message: validationMessages.nameMaxLength(UX_LIMITS.NAME_MAX_CHARS) })
  .refine((s) => s.trim().length > 0, { message: validationMessages.nameNonWhitespace })

export const instantIsoSchema: z.ZodType<InstantIso> = z
  .string()
  .refine(isValidInstantIso, { message: validationMessages.isoInstantInvalid })

export const localDateSchema: z.ZodType<LocalDate> = z
  .string()
  .refine(isValidLocalDate, { message: validationMessages.localDateInvalid })

export const localTimeSchema: z.ZodType<LocalTime> = z
  .string()
  .refine(isValidLocalTime, { message: validationMessages.localTimeInvalid })

export const timeZoneIdSchema: z.ZodType<TimeZoneId> = z
  .string()
  .refine(isValidTimeZoneId, { message: validationMessages.timeZoneIdInvalid })

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

export const durationValueSchema: z.ZodType<DurationValue> = z.strictObject({
  value: positiveFiniteNumberSchema,
  unit: timeUnitSchema,
})

export const durationRangeSchema: z.ZodType<DurationRange> = z
  .strictObject({
    min: durationValueSchema,
    max: durationValueSchema,
  })
  .refine((range) => compareDurationValues(range.min, range.max) <= 0, {
    message: validationMessages.durationRangeMinMax,
  })

export const paletteColorIdSchema: z.ZodType<PaletteColorId> = nonEmptyStringSchema

export const displayColorSchema: z.ZodType<DisplayColor> = z.strictObject({
  paletteColor: paletteColorIdSchema,
  legacyOriginalHex: z.string().optional(),
})
