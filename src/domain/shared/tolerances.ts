// Tolerâncias oficiais (§4) — valores NORMATIVOS, não alterar nesta etapa.
// Tolerância numérica ≠ orçamento físico de truncamento (CUTOFF_TOLERANCE).

/** Relativo para taxas (ke/ka), por ms. */
export const RATES_RTOL = 1e-10
/** Relativo para quantidades em mg. */
export const AMOUNT_RTOL = 1e-9
/** Absoluto para quantidades perto de zero, mg. */
export const AMOUNT_ATOL_MG = 1e-12
export const CONSERVATION_RTOL = 1e-9
export const TMAX_RECOMPOSITION_RTOL = 1e-9
export const PEAK_TIME_ABS_TOL_MS = 60_000
export const MILESTONE_TIME_ABS_TOL_MS = 60_000
/** Política de erro FÍSICO de truncamento do cutoff — não é tolerância de ponto flutuante. */
export const CUTOFF_TOLERANCE = 1e-12
/** Adimensional; soma das proporções dos componentes. */
export const PROPORTION_SUM_ATOL = 1e-12
/** SOMENTE detecção do warning NEAR_DEGENERATE_RATES — nunca seleção de algoritmo. */
export const NEAR_DEGENERATE_RATES_REL = 1e-8
/** Constante de APRESENTAÇÃO (política log §4) — não é tolerância farmacocinética. */
export const LOG_REL_EPSILON = 1e-12

/**
 * amountClose(a,b) ⟺ |a−b| ≤ AMOUNT_ATOL_MG + AMOUNT_RTOL·max(|a|,|b|)
 * Comportamento perto de zero definido via ATOL, sem divisão por zero.
 */
export function amountClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_ATOL_MG + AMOUNT_RTOL * Math.max(Math.abs(a), Math.abs(b))
}

/** conservationClose(a,b) ⟺ |a−b| ≤ AMOUNT_ATOL_MG + CONSERVATION_RTOL·max(|a|,|b|). */
export function conservationClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_ATOL_MG + CONSERVATION_RTOL * Math.max(Math.abs(a), Math.abs(b))
}

/** proportionSumClose(values) ⟺ |Σvalues − 1| ≤ PROPORTION_SUM_ATOL (adimensional; sem igualdade crua). */
export function proportionSumClose(values: number[]): boolean {
  let sum = 0
  for (const v of values) sum += v
  return Math.abs(sum - 1) <= PROPORTION_SUM_ATOL
}

/**
 * cutoffClose(a,b,sumDiscardedDoseMg) ⟺ amountClose estendido pelo orçamento físico
 * CUTOFF_TOLERANCE·sumDiscardedDoseMg. Invariante normativa:
 * sumDiscardedDoseMg = 0 ⇒ cutoffClose ≡ amountClose.
 */
export function cutoffClose(a: number, b: number, sumDiscardedDoseMg: number): boolean {
  return (
    Math.abs(a - b) <=
    AMOUNT_ATOL_MG + AMOUNT_RTOL * Math.max(Math.abs(a), Math.abs(b)) + CUTOFF_TOLERANCE * sumDiscardedDoseMg
  )
}
