import { analyze } from '../../../domain/pk/analysis'
import { sampleForDisplay } from '../../../domain/pk/sampling'
import { generateOccurrences } from '../../../domain/recurrence/generate'
import { assembleProtocolInputs } from '../../../domain/simulation/assemble'
import { deriveCalculationWindow } from '../../../domain/simulation/windows'
import type {
  CalculationWindow,
  DisplayColor,
  DisplayPoint,
  DisplayWindow,
  Protocol,
  SelectedPkParameters,
  SimulationInput,
  SimulationOutput,
} from '../../../domain/types'

export interface ProtocolComponentKey {
  protocolId: string
  componentId: string
}

export interface ProtocolLiveSeries {
  key: ProtocolComponentKey
  seriesId: string
  protocolId: string
  protocolName: string
  componentId: string
  componentLabel: string
  color: DisplayColor
  input: SimulationInput
  result: SimulationOutput
  displayPoints: DisplayPoint[]
}

export interface TemporalGuide {
  protocolId: string
  protocolName: string
  instantMs: number
  color: DisplayColor
}

export interface ProtocolLiveAnalysis {
  displayWindow: DisplayWindow
  calculationWindow: CalculationWindow
  series: ProtocolLiveSeries[]
  temporalGuides: TemporalGuide[]
}

/**
 * Pipeline de análise live de Protocolos (§7, §8, §10, E11):
 * - Deriva uma única CalculationWindow a partir de todos os parâmetros PK dos protocolos analisados
 * - Gera ocorrências dentro da CalculationWindow
 * - Produz EXATAMENTE 1 SimulationInput por componente (proibida média de meias-vidas ou soma artificial de blends)
 * - Identidade de série canônica por ProtocolComponentKey ({ protocolId, componentId })
 * - Reamostragem via sampleForDisplay limitada a 1200 pontos por série
 * - Guias temporais representam administrações visíveis estritamente em [displayWindow.startMs, displayWindow.endMs)
 */
export function analyzeProtocolsLive(
  protocols: ReadonlyArray<Protocol>,
  displayWindow: DisplayWindow,
  nowMs: number,
): ProtocolLiveAnalysis {
  const allParams: SelectedPkParameters[] = []
  for (const protocol of protocols) {
    for (const comp of protocol.components) {
      allParams.push(comp.selectedPkParameters)
    }
  }

  if (allParams.length === 0 || !protocols.length) {
    return {
      displayWindow,
      calculationWindow: { startMs: displayWindow.startMs, endMs: displayWindow.endMs },
      series: [],
      temporalGuides: [],
    }
  }

  const calculationWindow = deriveCalculationWindow(displayWindow, allParams)
  const series: ProtocolLiveSeries[] = []
  const guideMap = new Map<string, TemporalGuide>()

  for (const protocol of protocols) {
    if (!protocol.components || protocol.components.length === 0) {
      continue
    }

    let occurrences
    try {
      occurrences = generateOccurrences(
        protocol.schedule,
        calculationWindow.startMs,
        calculationWindow.endMs,
      )
    } catch {
      continue
    }

    // Coleta guias temporais de administrações estritamente dentro da DisplayWindow
    for (const occ of occurrences) {
      if (occ.instantMs >= displayWindow.startMs && occ.instantMs < displayWindow.endMs) {
        const guideKey = `${protocol.id}:${occ.instantMs}`
        if (!guideMap.has(guideKey)) {
          guideMap.set(guideKey, {
            protocolId: protocol.id,
            protocolName: protocol.name,
            instantMs: occ.instantMs,
            color: protocol.components[0]?.displayColor ?? { paletteColor: '#2563eb' },
          })
        }
      }
    }

    if (occurrences.length === 0) {
      continue
    }

    const assembled = assembleProtocolInputs(protocol, occurrences)
    if (!assembled.ok) {
      continue
    }

    for (const item of assembled.value) {
      const comp = protocol.components.find((c) => c.id === item.componentId)
      if (!comp) continue

      // Cópia defensiva atualizando nowMs para o instante live (§76)
      const liveInput: SimulationInput = {
        ...item.input,
        nowMs,
      }

      try {
        const result = analyze(liveInput)
        const displayPoints = sampleForDisplay(result.analysisCurve, {
          displayWindow,
          maxPoints: 1200,
        })

        series.push({
          key: { protocolId: protocol.id, componentId: comp.id },
          seriesId: `${protocol.id}:${comp.id}`,
          protocolId: protocol.id,
          protocolName: protocol.name,
          componentId: comp.id,
          componentLabel: comp.label,
          color: comp.displayColor,
          input: liveInput,
          result,
          displayPoints,
        })
      } catch {
        // Falha no motor para um componente não quebra os outros
      }
    }
  }

  const temporalGuides = Array.from(guideMap.values()).sort(
    (a, b) => a.instantMs - b.instantMs,
  )

  return {
    displayWindow,
    calculationWindow,
    series,
    temporalGuides,
  }
}
