import { domainError } from '../shared/errors'

// ke = ln2 / T½  (§4). Erro se halfLifeMs <= 0 ou não finito.
export function eliminationRate(halfLifeMs: number): number {
  if (!Number.isFinite(halfLifeMs) || halfLifeMs <= 0) {
    throw domainError('HALF_LIFE_NON_POSITIVE', { halfLifeMs })
  }
  const ke = Math.LN2 / halfLifeMs
  if (!Number.isFinite(ke) || ke <= 0) {
    throw domainError('HALF_LIFE_NON_POSITIVE', { halfLifeMs })
  }
  return ke
}

export interface AbsorptionSolverInput {
  halfLifeMs: number
  /** null/0 ⇒ absorção instantânea (ka = null); < 0 ⇒ TMAX_NEGATIVE. */
  tmaxMs: number | null
}

export interface AbsorptionResult {
  kePerMs: number
  /** null = instantânea. */
  kaPerMs: number | null
}

/**
 * Solver de ka a partir de Tmax (§4):
 *   g(y) = y/expm1(y) = c, c = ke·Tmax, y = ln(ka/ke), ka = ke·exp(y).
 * Taylor 1−y/2+y²/12 quando |y|<1e-8; bracket normativo; bisseção por 180 iterações.
 * Pós-condição para Tmax>0: aceitar somente kaCandidate finite>0;
 * caso contrário ABSORPTION_SOLVER_FAILURE. Sem ramo alternativo por threshold.
 */
export function absorptionRateFromTmax(input: AbsorptionSolverInput): AbsorptionResult {
  const kePerMs = eliminationRate(input.halfLifeMs)

  const tmaxMs = input.tmaxMs
  if (tmaxMs === null || tmaxMs === 0) {
    return { kePerMs, kaPerMs: null }
  }
  if (!Number.isFinite(tmaxMs) || tmaxMs < 0) {
    throw domainError('TMAX_NEGATIVE', { tmaxMs })
  }

  const c = kePerMs * tmaxMs
  if (!Number.isFinite(c) || c <= 0) {
    throw domainError('ABSORPTION_SOLVER_FAILURE', { c })
  }

  const y = solveG(c)
  const expY = Math.exp(y)
  const kaCandidate = kePerMs * expY
  if (!Number.isFinite(kaCandidate) || kaCandidate <= 0) {
    throw domainError('ABSORPTION_SOLVER_FAILURE', { c })
  }

  return { kePerMs, kaPerMs: kaCandidate }
}

/** Avaliação estável de g(y)=y/expm1(y), com extensão contínua g(0)=1. */
function evalG(y: number): number {
  if (Math.abs(y) < 1e-8) {
    return 1 - y / 2 + (y * y) / 12
  }
  return y / Math.expm1(y)
}

/** Resolve g(y)=c por bracket normativo + bisseção (180 iterações determinísticas). */
function solveG(c: number): number {
  if (c === 1) {
    return 0
  }

  let lo: number
  let hi: number
  if (c < 1) {
    lo = 0
    hi = 1
    while (evalG(hi) > c) {
      hi *= 2
      if (!Number.isFinite(hi)) {
        throw domainError('ABSORPTION_SOLVER_FAILURE', { c })
      }
    }
  } else {
    lo = -1
    hi = 0
    while (evalG(lo) < c) {
      lo *= 2
      if (!Number.isFinite(lo)) {
        throw domainError('ABSORPTION_SOLVER_FAILURE', { c })
      }
    }
  }

  for (let i = 0; i < 180; i++) {
    const mid = (lo + hi) / 2
    if (evalG(mid) > c) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/** Âncora educacional: Tmax crítico que produz ka=ke é T½/ln2. */
export function tmaxForEqualRates(halfLifeMs: number): number {
  return halfLifeMs / Math.LN2
}
