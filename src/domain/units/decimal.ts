// Parsing decimal pt-BR central (§4/§8): converte APENAS texto numérico em número.
// Regras:
//  - separador decimal aceito: ',' OU '.' (um único);
//  - parte inteira obrigatória; fração opcional;
//  - espaços nas bordas são tolerados;
//  - sinal '+'/'-' sintático é aceito (validações de domínio pertencem à E5);
//  - NÃO interpreta separador de milhares: "1.234,56" é ambíguo ⇒ rejeitado;
//  - NUNCA retorna NaN/Infinity como sucesso.

export type ParseDecimalResult =
  | { ok: true; value: number }
  | { ok: false }

const DECIMAL_PATTERN = /^[+-]?\d+(?:[.,]\d+)?$/

/**
 * Converte texto numérico simples (pt-BR ou ponto) em number.
 * Exemplos aceitos: "0,5"→0.5 · "0.5"→0.5 · "1"→1 · "  12,75  "→12.75 · "-2,5"→-2.5
 * Rejeitados: "" · "," · "." · "1,2,3" · "1.2.3" · "1,2.3" · "abc" · "12abc" · "NaN" · "Infinity".
 */
export function parseLocaleDecimal(input: string): ParseDecimalResult {
  const trimmed = input.trim()
  if (!DECIMAL_PATTERN.test(trimmed)) {
    return { ok: false }
  }
  const normalized = trimmed.replace(',', '.')
  const value = Number(normalized)
  if (!Number.isFinite(value)) {
    return { ok: false }
  }
  // Normaliza -0 para 0 (determinismo de apresentação/persistência).
  return { ok: true, value: value === 0 ? 0 : value }
}
