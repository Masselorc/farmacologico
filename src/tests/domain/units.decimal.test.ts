import { describe, expect, it } from 'vitest'
import { parseLocaleDecimal } from '../../domain/units/decimal'

describe('parseLocaleDecimal — aceitos', () => {
  it.each([
    ['0,5', 0.5],
    ['0.5', 0.5],
    ['1', 1],
    ['  12,75  ', 12.75],
    ['-2,5', -2.5],
    ['+3,25', 3.25],
    ['1234', 1234],
    ['0,001', 0.001],
    ['10', 10],
  ])('%s → %s', (input, expected) => {
    const result = parseLocaleDecimal(input)
    expect(result).toEqual({ ok: true, value: expected })
  })

  it('nunca retorna NaN/Infinity como sucesso', () => {
    for (const input of ['NaN', 'Infinity', '-Infinity']) {
      expect(parseLocaleDecimal(input).ok).toBe(false)
    }
  })

  it('-0 é normalizado para 0', () => {
    const result = parseLocaleDecimal('-0')
    expect(result).toEqual({ ok: true, value: 0 })
    if (result.ok) {
      expect(Object.is(result.value, -0)).toBe(false)
    }
  })
})

describe('parseLocaleDecimal — rejeitados', () => {
  it.each([
    '',
    '   ',
    ',',
    '.',
    '1,2,3',
    '1.2.3',
    '1,2.3',
    '1.2,3',
    'abc',
    '12abc',
    'NaN',
    'Infinity',
    '-Infinity',
    '.5',
    '5.',
    '1.234,56',
    '1e5',
    '0x10',
  ])('%s é rejeitado', (input) => {
    expect(parseLocaleDecimal(input)).toEqual({ ok: false })
  })

  it('não interpreta separador de milhares ("1.234" vira 1.234, nunca 1234 mágico)', () => {
    const result = parseLocaleDecimal('1.234')
    expect(result).toEqual({ ok: true, value: 1.234 })
    expect(parseLocaleDecimal('1.234,56').ok).toBe(false)
  })
})
