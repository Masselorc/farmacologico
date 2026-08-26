import { describe, expect, it } from 'vitest'
import {
  APP_LOCALE,
  formatDuration,
  formatLongDateTime,
  formatMassMg,
  formatShortDateTime,
} from '../../domain/units/format'
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from '../../domain/units/convert'

const SAO_PAULO = 'America/Sao_Paulo'

describe('formatação de massa/dose pt-BR (até 3 casas)', () => {
  it.each([
    [0.5, '0,5'],
    [1.234, '1,234'],
    [1, '1'],
    [2.5, '2,5'],
    [0.25, '0,25'],
  ])('%f → "%s"', (value, expected) => {
    expect(formatMassMg(value)).toBe(expected)
  })
})

describe('formatação de duração normativa "X d Y h Z min"', () => {
  it.each([
    [0, '0 min'],
    [MS_PER_MINUTE * 30, '30 min'],
    [MS_PER_DAY, '1 d'],
    [MS_PER_DAY + MS_PER_HOUR * 2, '1 d 2 h'],
    [MS_PER_DAY + MS_PER_HOUR * 2 + MS_PER_MINUTE * 30, '1 d 2 h 30 min'],
    [MS_PER_HOUR * 5, '5 h'],
    [MS_PER_HOUR + MS_PER_MINUTE * 15, '1 h 15 min'],
    // Resíduo < 1 min é truncado apenas na apresentação.
    [MS_PER_MINUTE * 90 + 59_999, '1 h 30 min'],
    [999, '0 min'],
  ])('%d ms → "%s"', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })

  it('não exibe unidades zeradas intermediárias', () => {
    expect(formatDuration(MS_PER_DAY + MS_PER_MINUTE * 5)).toBe('1 d 5 min')
  })

  it('entrada negativa é tratada como 0 para apresentação', () => {
    expect(formatDuration(-1000)).toBe('0 min')
  })
})

describe('datas no TimeZoneId informado', () => {
  const instantIso = '2026-08-26T22:30:00Z'

  it('data curta dd/mm/aaaa hh:mm em São Paulo (19:30 do dia 26)', () => {
    expect(formatShortDateTime(instantIso, SAO_PAULO)).toBe('26/08/2026 19:30')
  })

  it('data curta muda de dia conforme o fuso (Tóquio 07:30 do dia 27)', () => {
    expect(formatShortDateTime(instantIso, 'Asia/Tokyo')).toBe('27/08/2026 07:30')
  })

  it('data por extenso pt-BR contém dia, mês, ano e hora corretos', () => {
    const long = formatLongDateTime(instantIso, SAO_PAULO)
    expect(long).toContain('26')
    expect(long).toContain('agosto')
    expect(long).toContain('2026')
    expect(long).toContain('19:30')
  })

  it('locale normativo fixado como pt-BR', () => {
    expect(APP_LOCALE).toBe('pt-BR')
  })
})
