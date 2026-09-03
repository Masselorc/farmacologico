import type { Duration, DurationRange, DurationValue } from '../../../domain/shared/types.datetime'
import type { PkParametersSnapshot, SelectedPkParameters } from '../../../domain/types'
import type { PharmacokineticProfile } from '../../../domain/library/types'
import {
  durationValueToMs,
  normalizeDurationRange,
} from '../../../domain/units/convert'

function isDurationRange(d: Duration): d is DurationRange {
  return 'min' in d
}

export interface ProfileParameterSelectionInput {
  chosenHalfLife?: DurationValue
  chosenTmax?: 'instant' | DurationValue
}

export interface ResolvedProfileParameters {
  selectedPkParameters: SelectedPkParameters
  pkParametersSnapshot: PkParametersSnapshot
  needsUserSelection: boolean
  missingFields: Array<'halfLife' | 'tmax'>
}

/**
 * Resolve parâmetros PK de um perfil considerando especificações exatas ou faixas (§6, §9).
 */
export function resolveProfileParameters(
  profile: PharmacokineticProfile,
  input?: ProfileParameterSelectionInput,
): ResolvedProfileParameters {
  const missingFields: Array<'halfLife' | 'tmax'> = []

  // 1. Meia-vida
  let halfLifeMs = 0
  let halfLifeSnapshot: DurationValue = { value: 0, unit: 'days' }
  let halfLifeRangeNote: DurationRange | undefined = undefined

  if (isDurationRange(profile.halfLife)) {
    const range = profile.halfLife
    halfLifeRangeNote = range
    if (!input?.chosenHalfLife) {
      missingFields.push('halfLife')
    } else {
      // Valida se está no intervalo normalizado
      const norm = normalizeDurationRange(range)
      const chosenMs = durationValueToMs(input.chosenHalfLife)
      if (chosenMs < norm.minMs || chosenMs > norm.maxMs) {
        throw new Error(`Meia-vida selecionada fora do intervalo [${norm.minMs}ms, ${norm.maxMs}ms]`)
      }
      halfLifeMs = chosenMs
      halfLifeSnapshot = input.chosenHalfLife
    }
  } else {
    const exact = profile.halfLife as DurationValue
    halfLifeMs = durationValueToMs(exact)
    halfLifeSnapshot = exact
  }

  // 2. Tmax
  let tmaxMs: number | null = null
  let tmaxSnapshot: DurationValue | null = null
  let tmaxRangeNote: DurationRange | undefined = undefined

  switch (profile.tmaxSpec.kind) {
    case 'instant':
      tmaxMs = null
      tmaxSnapshot = null
      break

    case 'value':
      tmaxMs = durationValueToMs(profile.tmaxSpec.value)
      tmaxSnapshot = profile.tmaxSpec.value
      break

    case 'unknown':
      if (!input?.chosenTmax) {
        missingFields.push('tmax')
      } else if (input.chosenTmax === 'instant') {
        tmaxMs = null
        tmaxSnapshot = null
      } else {
        tmaxMs = durationValueToMs(input.chosenTmax)
        tmaxSnapshot = input.chosenTmax
      }
      break

    case 'range': {
      const range = profile.tmaxSpec.range
      tmaxRangeNote = range
      if (!input?.chosenTmax) {
        missingFields.push('tmax')
      } else if (input.chosenTmax === 'instant') {
        throw new Error('Tmax definido por faixa não admite absorção instantânea; informe um valor dentro do intervalo')
      } else {
        const norm = normalizeDurationRange(range)
        const chosenMs = durationValueToMs(input.chosenTmax)
        if (chosenMs < norm.minMs || chosenMs > norm.maxMs) {
          throw new Error(`Tmax selecionado fora do intervalo [${norm.minMs}ms, ${norm.maxMs}ms]`)
        }
        tmaxMs = chosenMs
        tmaxSnapshot = input.chosenTmax
      }
      break
    }
  }

  const hasRangeNote = halfLifeRangeNote !== undefined || tmaxRangeNote !== undefined

  const selectedPkParameters: SelectedPkParameters = {
    halfLifeMs,
    tmaxMs,
    ...(hasRangeNote
      ? {
          selectionNote: {
            range: {
              ...(halfLifeRangeNote ? { halfLife: halfLifeRangeNote } : {}),
              ...(tmaxRangeNote ? { tmaxRange: tmaxRangeNote } : {}),
            },
            chosenBy: 'user' as const,
          },
        }
      : {}),
  }

  const pkParametersSnapshot: PkParametersSnapshot = {
    halfLife: halfLifeSnapshot,
    tmax: tmaxSnapshot,
    ...(hasRangeNote
      ? {
          selectedFromRange: {
            ...(halfLifeRangeNote ? { halfLife: halfLifeRangeNote } : {}),
            ...(tmaxRangeNote ? { tmax: tmaxRangeNote } : {}),
          },
        }
      : {}),
  }

  return {
    selectedPkParameters,
    pkParametersSnapshot,
    needsUserSelection: missingFields.length > 0,
    missingFields,
  }
}
