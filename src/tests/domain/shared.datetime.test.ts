import { describe, expect, it } from 'vitest'
import {
  DateTimeError,
  civilToInstantIso,
  canonicalizeInstantIso,
  instantToZonedParts,
  isValidInstantIso,
  isValidLocalDate,
  isValidLocalTime,
  isValidTimeZoneId,
} from '../../domain/shared/datetime'

// Fixtures DST normativas (§4): America/New_York, independentes do fuso do host.
const NEW_YORK = 'America/New_York'
const SAO_PAULO = 'America/Sao_Paulo'
const TOKYO = 'Asia/Tokyo'

describe('civilToInstantIso — horário normal', () => {
  it('converte com TimeZoneId explícito (São Paulo, UTC-3)', () => {
    expect(
      civilToInstantIso({ localDate: '2026-08-26', localTime: '11:00', timeZone: SAO_PAULO }),
    ).toBe('2026-08-26T14:00:00Z')
  })

  it('InstantIso canônico termina em Z (nunca offset civil persistido)', () => {
    const instant = civilToInstantIso({ localDate: '2026-01-15', localTime: '08:30', timeZone: TOKYO })
    expect(instant.endsWith('Z')).toBe(true)
    expect(instant).toBe('2026-01-14T23:30:00Z')
  })

  it('canonicalizeInstantIso normaliza formas equivalentes para Z', () => {
    expect(canonicalizeInstantIso('2026-08-26T11:00:00+02:00')).toBe('2026-08-26T09:00:00Z')
  })
})

describe('DST GAP — política later (desloca PARA FRENTE pela duração do gap)', () => {
  it('fixture America/New_York 2024-03-10 02:30 → resolvido 03:30', () => {
    const instant = civilToInstantIso({ localDate: '2024-03-10', localTime: '02:30', timeZone: NEW_YORK })
    expect(instant).toBe('2024-03-10T07:30:00Z')

    const parts = instantToZonedParts({ instantIso: instant, timeZone: NEW_YORK })
    expect(parts.localDate).toBe('2024-03-10')
    expect(parts.localTime).toBe('03:30')
    expect(parts.offset).toBe('-04:00')
  })

  it('GAP não é interpretado como 03:00 (primeiro instante válido)', () => {
    const instant = civilToInstantIso({ localDate: '2024-03-10', localTime: '02:30', timeZone: NEW_YORK })
    const parts = instantToZonedParts({ instantIso: instant, timeZone: NEW_YORK })
    expect(parts.localTime).not.toBe('03:00')
  })
})

describe('DST OVERLAP — política earlier (primeira ocorrência)', () => {
  it('fixture America/New_York 2024-11-03 01:30 → primeira ocorrência (EDT, -04:00)', () => {
    const instant = civilToInstantIso({ localDate: '2024-11-03', localTime: '01:30', timeZone: NEW_YORK })
    expect(instant).toBe('2024-11-03T05:30:00Z')

    const parts = instantToZonedParts({ instantIso: instant, timeZone: NEW_YORK })
    expect(parts.localDate).toBe('2024-11-03')
    expect(parts.localTime).toBe('01:30')
    expect(parts.offset).toBe('-04:00')
  })

  it('round-trip preserva o horário civil escolhendo o instante earlier', () => {
    const input = { localDate: '2024-11-03', localTime: '01:30', timeZone: NEW_YORK }
    const instant = civilToInstantIso(input)
    const back = instantToZonedParts({ instantIso: instant, timeZone: NEW_YORK })
    expect(back.localDate).toBe(input.localDate)
    expect(back.localTime).toBe(input.localTime)
  })
})

describe('round-trip temporal', () => {
  it('horário normal preserva data/hora/minuto', () => {
    const input = { localDate: '2026-03-15', localTime: '09:45', timeZone: SAO_PAULO }
    const instant = civilToInstantIso(input)
    const parts = instantToZonedParts({ instantIso: instant, timeZone: SAO_PAULO })
    expect(parts.localDate).toBe('2026-03-15')
    expect(parts.localTime).toBe('09:45')
  })

  it('GAP: round-trip retorna o horário RESOLVIDO pela política later', () => {
    const instant = civilToInstantIso({ localDate: '2024-03-10', localTime: '02:30', timeZone: NEW_YORK })
    const parts = instantToZonedParts({ instantIso: instant, timeZone: NEW_YORK })
    expect([parts.localDate, parts.localTime]).toEqual(['2024-03-10', '03:30'])
  })

  it('mesmo InstantIso em TZ A vs TZ B: civis diferentes, instante idêntico', () => {
    const instantIso = '2026-08-26T22:00:00Z'
    const sp = instantToZonedParts({ instantIso, timeZone: SAO_PAULO })
    const tokyo = instantToZonedParts({ instantIso, timeZone: TOKYO })

    expect([sp.localDate, sp.localTime]).toEqual(['2026-08-26', '19:00'])
    expect([tokyo.localDate, tokyo.localTime]).toEqual(['2026-08-27', '07:00'])

    expect(canonicalizeInstantIso(instantIso)).toBe(instantIso)
    expect(sp.epochMilliseconds).toBe(tokyo.epochMilliseconds)
  })
})

describe('validações temporais determinísticas', () => {
  it('timezone inexistente rejeitada', () => {
    expect(isValidTimeZoneId('Marte/Olympus_Mons')).toBe(false)
    expect(isValidTimeZoneId(SAO_PAULO)).toBe(true)
    expect(() =>
      civilToInstantIso({ localDate: '2026-08-26', localTime: '10:00', timeZone: 'Marte/Olympus_Mons' }),
    ).toThrow(DateTimeError)
  })

  it('LocalDate inválida rejeitada (formato e calendário)', () => {
    expect(isValidLocalDate('2026-13-01')).toBe(false)
    expect(isValidLocalDate('2026-02-30')).toBe(false)
    expect(isValidLocalDate('26/08/2026')).toBe(false)
    expect(isValidLocalDate('2026-08-26')).toBe(true)
    try {
      civilToInstantIso({ localDate: '2026-02-30', localTime: '10:00', timeZone: SAO_PAULO })
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect((error as DateTimeError).code).toBe('INVALID_LOCAL_DATE')
    }
  })

  it('LocalTime inválida rejeitada', () => {
    expect(isValidLocalTime('25:00')).toBe(false)
    expect(isValidLocalTime('02:61')).toBe(false)
    expect(isValidLocalTime('abc')).toBe(false)
    expect(isValidLocalTime('02:30')).toBe(true)
    expect(isValidLocalTime('14:05:09')).toBe(true)
    try {
      civilToInstantIso({ localDate: '2026-08-26', localTime: '25:00', timeZone: SAO_PAULO })
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect((error as DateTimeError).code).toBe('INVALID_LOCAL_TIME')
    }
  })

  it('InstantIso inválido (ou sem offset) rejeitado', () => {
    expect(isValidInstantIso('nao-e-instante')).toBe(false)
    expect(isValidInstantIso('2026-08-26T11:00:00')).toBe(false)
    expect(isValidInstantIso('2026-08-26T11:00:00Z')).toBe(true)
    try {
      instantToZonedParts({ instantIso: '2026-08-26T11:00:00', timeZone: SAO_PAULO })
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect((error as DateTimeError).code).toBe('INVALID_INSTANT')
    }
  })
})
