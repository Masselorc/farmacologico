import { MS_PER_DAY } from '../units/convert'
import type { SelectedPkParameters } from '../types'
import { eliminationRate } from './rates'
import { resolveKinetics, terminalRate } from './state'

// Cutoff/lookback — política ÚNICA (§4). Nenhuma feature pode inventar lookback próprio.

/** Constante normativa — NÃO alterar nesta etapa (prova completa do bound é da E4). */
export const CONTRIBUTION_CUTOFF_HALF_LIVES = 44 as const

/** effectiveTmaxMs = selected.tmaxMs ?? 0 — null (instantânea) vira 0 SEM coerção implícita de outros casos. */
export function effectiveTmaxMs(selected: SelectedPkParameters): number {
  return selected.tmaxMs ?? 0
}

/**
 * Idade de corte para os parâmetros selecionados:
 *   cutoffAge = max(44·T½term + effectiveTmax, effectiveTmax + 86_400_000 ms)
 */
export function cutoffAgeFor(selected: SelectedPkParameters): number {
  const effTmax = effectiveTmaxMs(selected)
  const kinetics = resolveKinetics(selected.halfLifeMs, selected.tmaxMs)
  const terminalHalfLifeMs = Math.LN2 / terminalRate(kinetics)
  return Math.max(
    CONTRIBUTION_CUTOFF_HALF_LIVES * terminalHalfLifeMs + effTmax,
    effTmax + MS_PER_DAY,
  )
}

/** T½ terminal dos parâmetros (ln2/rateTerminal). */
export function terminalHalfLifeMsOf(selected: SelectedPkParameters): number {
  const ke = eliminationRate(selected.halfLifeMs)
  if (selected.tmaxMs === null || selected.tmaxMs === 0) {
    return Math.LN2 / ke
  }
  const kinetics = resolveKinetics(selected.halfLifeMs, selected.tmaxMs)
  return Math.LN2 / terminalRate(kinetics)
}
