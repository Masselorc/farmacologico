import { Temporal } from '@js-temporal/polyfill'
import { civilToInstantIso } from '../../../domain/shared/datetime'
import { stateAt } from '../../../domain/pk/state'
import { generateOccurrences } from '../../../domain/recurrence/generate'
import { assembleProtocolInputs } from '../../../domain/simulation/assemble'
import { requiredPkLookback } from '../../../domain/simulation/windows'
import type { LocalDate, Protocol, TimeZoneId, DisplayColor } from '../../../domain/types'

export interface ProtocolDayEstimate {
  protocolId: string
  protocolName: string
  estimatedMg: number
  color: DisplayColor
}

export const CHIP_MINIMUM_ESTIMATED_MG = 0.01

/**
 * Avalia as estimativas de quantidade central (centralMg) para cada protocolo em um dia civil às 20:00
 * no fuso de exibição calendarTimeZone (§10, §18, E11).
 *
 * Invariantes:
 * - Janela de materialização: [evalInstantMs - requiredPkLookback, evalInstantMs + 1)
 * - Soma de centralMg dos componentes do protocolo (não soma eliminatedMg, não faz média)
 * - Filtro: < 0.01 mg oculto; >= 0.01 mg visível (sem arredondamento prévio)
 * - Ordenação decrescente de estimatedMg, desempate por protocolName e protocolId
 */
export function evaluateDayProtocolEstimates(
  protocols: ReadonlyArray<Protocol>,
  localDate: LocalDate,
  calendarTimeZone: TimeZoneId,
): ProtocolDayEstimate[] {
  const evalInstantIso = civilToInstantIso({
    localDate,
    localTime: '20:00',
    timeZone: calendarTimeZone,
  })
  const evalInstantMs = Temporal.Instant.from(evalInstantIso).epochMilliseconds

  const estimates: ProtocolDayEstimate[] = []

  for (const protocol of protocols) {
    if (!protocol.components || protocol.components.length === 0) {
      continue
    }

    const lookbackMs = requiredPkLookback(protocol.components.map((c) => c.selectedPkParameters))
    const startMs = evalInstantMs - lookbackMs
    const endMs = evalInstantMs + 1

    let occurrences
    try {
      occurrences = generateOccurrences(protocol.schedule, startMs, endMs)
    } catch {
      continue
    }

    if (occurrences.length === 0) {
      continue
    }

    const assembled = assembleProtocolInputs(protocol, occurrences)
    if (!assembled.ok) {
      continue
    }

    let protocolCentralMg = 0

    for (const item of assembled.value) {
      try {
        const pkState = stateAt(
          item.input.doses,
          evalInstantMs,
          item.input.halfLifeMs,
          item.input.tmaxMs,
        )
        protocolCentralMg += pkState.centralMg
      } catch {
        // Falha numérica pontual não interrompe os demais componentes
      }
    }

    // Filtro de corte estrito: < 0.01 mg oculto
    if (protocolCentralMg >= CHIP_MINIMUM_ESTIMATED_MG) {
      estimates.push({
        protocolId: protocol.id,
        protocolName: protocol.name,
        estimatedMg: protocolCentralMg,
        color: protocol.components[0]?.displayColor ?? { paletteColor: '#2563eb' },
      })
    }
  }

  // Ordenação decrescente de estimatedMg; desempate determinístico por nome e ID
  estimates.sort((a, b) => {
    if (b.estimatedMg !== a.estimatedMg) {
      return b.estimatedMg - a.estimatedMg
    }
    const nameDiff = a.protocolName.localeCompare(b.protocolName)
    if (nameDiff !== 0) return nameDiff
    return a.protocolId.localeCompare(b.protocolId)
  })

  return estimates
}
