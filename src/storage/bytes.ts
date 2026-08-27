// Medição normativa de bytes e truncamento seguro UTF-8 (§6, §11).

/**
 * Mede os bytes UTF-8 da serialização canônica exata do export (§6).
 * serializedUtf8Bytes(value) = new TextEncoder().encode(JSON.stringify(value)).byteLength
 */
export function serializedUtf8Bytes(value: unknown): number {
  try {
    const json = JSON.stringify(value)
    if (json === undefined) {
      return 0
    }
    return new TextEncoder().encode(json).byteLength
  } catch {
    return Number.POSITIVE_INFINITY
  }
}


/**
 * Trunca uma string garantindo que seu tamanho UTF-8 codificado não ultrapasse `maxBytes`.
 * Trunca preservando code points Unicode completos (nunca divide surrogate pairs ou bytes multibyte).
 */
export function truncateUtf8Bytes(
  str: string,
  maxBytes: number,
): { text: string; truncated: boolean; bytes: number } {
  if (maxBytes <= 0) {
    return { text: '', truncated: str.length > 0, bytes: 0 }
  }

  const encoder = new TextEncoder()
  const fullBytes = encoder.encode(str)
  if (fullBytes.byteLength <= maxBytes) {
    return { text: str, truncated: false, bytes: fullBytes.byteLength }
  }

  // Itera por code points usando o iterator padrão do JS (respeita surrogate pairs)
  let accumulated = ''
  let currentBytes = 0

  for (const char of str) {
    const charBytes = encoder.encode(char).byteLength
    if (currentBytes + charBytes > maxBytes) {
      return { text: accumulated, truncated: true, bytes: currentBytes }
    }
    accumulated += char
    currentBytes += charBytes
  }

  return { text: accumulated, truncated: true, bytes: currentBytes }
}
