import { describe, expect, it } from 'vitest'
import { SAFETY_LIMITS } from '../../validation/limits'
import { recurrenceSchema, scheduleSchema } from '../../validation/schemas/recurrence'

describe('E5 Recurrence & Schedule Schemas (§6)', () => {
  describe('recurrenceSchema', () => {
    it('aceita dose única (single)', () => {
      const parsed = recurrenceSchema.safeParse({ type: 'single' })
      expect(parsed.success).toBe(true)
    })

    it('aceita recorrência semanal canônica válida', () => {
      const parsed = recurrenceSchema.safeParse({
        type: 'weekly',
        weekdays: [1, 3, 5],
        weeks: 12,
      })
      expect(parsed.success).toBe(true)
    })

    it('aceita fronteiras de semanas: 1 e 520', () => {
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1], weeks: 1 }).success).toBe(true)
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1], weeks: SAFETY_LIMITS.WEEKS_MAX }).success).toBe(true)
    })

    it('rejeita semanas fora do intervalo (0, 521, decimais, negativos)', () => {
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1], weeks: 0 }).success).toBe(false)
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1], weeks: 521 }).success).toBe(false)
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1], weeks: 1.5 }).success).toBe(false)
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1], weeks: -4 }).success).toBe(false)
    })

    it('rejeita weekdays desordenados, duplicados ou vazios', () => {
      // Desordenado
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [3, 1], weeks: 4 }).success).toBe(false)
      // Duplicado
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1, 1, 3], weeks: 4 }).success).toBe(false)
      // Vazio
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [], weeks: 4 }).success).toBe(false)
      // Fora de 1..7
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [0, 1], weeks: 4 }).success).toBe(false)
      expect(recurrenceSchema.safeParse({ type: 'weekly', weekdays: [1, 8], weeks: 4 }).success).toBe(false)
    })
  })

  describe('scheduleSchema', () => {
    it('valida Schedule completo com fuso e horário civil válidos', () => {
      const valid = {
        startDate: '2026-08-26',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'weekly', weekdays: [1, 4], weeks: 8 },
      }
      expect(scheduleSchema.safeParse(valid).success).toBe(true)
    })

    it('rejeita Schedule com data, hora ou fuso inválidos', () => {
      const invalidDate = {
        startDate: '2026-02-30',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      }
      expect(scheduleSchema.safeParse(invalidDate).success).toBe(false)

      const invalidTime = {
        startDate: '2026-08-26',
        localTime: '25:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      }
      expect(scheduleSchema.safeParse(invalidTime).success).toBe(false)

      const invalidTz = {
        startDate: '2026-08-26',
        localTime: '08:00',
        timeZone: 'Invalido/Fuso',
        recurrence: { type: 'single' },
      }
      expect(scheduleSchema.safeParse(invalidTz).success).toBe(false)
    })
  })
})
