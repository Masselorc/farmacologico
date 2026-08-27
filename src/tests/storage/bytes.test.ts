import { describe, expect, it } from 'vitest'
import { serializedUtf8Bytes, truncateUtf8Bytes } from '../../storage/bytes'
import { SAFETY_LIMITS } from '../../validation/limits'

describe('Storage Bytes Measurement & Safe Truncation (§6, §11)', () => {
  it('mede corretamente strings ASCII, nulas e objetos simples', () => {
    expect(serializedUtf8Bytes('test')).toBe(6) // "test" com aspas JSON
    expect(serializedUtf8Bytes(123)).toBe(3)
    expect(serializedUtf8Bytes({ a: 1 })).toBe(7) // {"a":1}
    expect(serializedUtf8Bytes(null)).toBe(4) // null
  })

  it('mede corretamente caracteres acentuados e UTF-8 multibyte', () => {
    // 'ação': 'a' (1) + 'ç' (2) + 'ã' (2) + 'o' (1) = 6 bytes + 2 aspas = 8 bytes
    expect(serializedUtf8Bytes('ação')).toBe(8)

    // Emoji 💉 = 4 bytes UTF-8 + 2 aspas = 6 bytes
    expect(serializedUtf8Bytes('💉')).toBe(6)

    // String mista: 'FARMakit 💉 ação'
    const str = 'FARMakit 💉 ação'
    const expectedBytes = new TextEncoder().encode(JSON.stringify(str)).byteLength
    expect(serializedUtf8Bytes(str)).toBe(expectedBytes)
  })

  it('valida limites exatos de fronteira (limite exato vs limite + 1 byte)', () => {
    const limit = SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX // 262_144
    const exactArray = new Array(limit).fill('a').join('')
    // JSON.stringify adiciona 2 aspas
    const exactStr = exactArray.slice(0, limit - 2)
    expect(serializedUtf8Bytes(exactStr)).toBe(limit)

    const overStr = exactArray.slice(0, limit - 1)
    expect(serializedUtf8Bytes(overStr)).toBe(limit + 1)
  })

  it('trunca strings em UTF-8 sem quebrar code points multibyte ou surrogate pairs', () => {
    const text = 'Olá Mundo 💉💊 Teste'
    // 'Olá' = 4 bytes ('O'(1), 'l'(1), 'á'(2))
    const res4 = truncateUtf8Bytes(text, 4)
    expect(res4.text).toBe('Olá')
    expect(res4.bytes).toBe(4)
    expect(res4.truncated).toBe(true)

    // Truncamento que cairia no meio do emoji 💉 (4 bytes)
    // 'Olá Mundo ' = 11 bytes. Se pedirmos 13 bytes, o emoji (4 bytes) não cabe inteiro e deve parar em 11.
    const res13 = truncateUtf8Bytes(text, 13)
    expect(res13.text).toBe('Olá Mundo ')
    expect(res13.bytes).toBe(11)
    expect(res13.truncated).toBe(true)

    // String completa menor que o limite
    const resFull = truncateUtf8Bytes('ABC', 10)
    expect(resFull.text).toBe('ABC')
    expect(resFull.bytes).toBe(3)
    expect(resFull.truncated).toBe(false)
  })
})
