import { Temporal } from '@js-temporal/polyfill'
import { domainError, type DomainError } from '../shared/errors'
import { ok, type Result } from '../shared/result'
import { proportionSumClose } from '../shared/tolerances'
import { SAFETY_LIMITS } from '../../validation/limits'
import type {
  CalculationWindow,
  Dose,
  Occurrence,
  Protocol,
  Scenario,
  SelectedPkParameters,
  SimulationDose,
  SimulationInput,
} from '../types'

// Cola de simulação (§7). Comparador e Protocolos possuem fluxos DELIBERADAMENTE distintos.
// Scenario NUNCA chama Recurrence; Protocolo NUNCA usa doses explícitas do Scenario.

/** InstantIso → ms canônico (uma única conversão explícita e determinística). */
export function instantIsoToEpochMs(instantIso: string): number {
  const instant = Temporal.Instant.from(instantIso)
  if (!Number.isFinite(instant.epochMilliseconds)) {
    throw domainError('INVALID_DOSE_TIME', { instantIso })
  }
  return instant.epochMilliseconds
}

/**
 * Seleciona SOMENTE doses com calculationWindow.startMs ≤ timeMs < endMs.
 * O array original nunca é mutado; o Scenario integral permanece persistido.
 */
export function selectRelevantScenarioDoses(
  doses: ReadonlyArray<Dose>,
  calculationWindow: CalculationWindow,
): Array<Dose> {
  if (
    !Number.isFinite(calculationWindow.startMs) ||
    !Number.isFinite(calculationWindow.endMs) ||
    calculationWindow.startMs >= calculationWindow.endMs
  ) {
    throw domainError('INVALID_HORIZON', {
      startMs: calculationWindow.startMs,
      endMs: calculationWindow.endMs,
    })
  }

  return doses.filter((dose) => {
    const timeMs = instantIsoToEpochMs(dose.time)
    return timeMs >= calculationWindow.startMs && timeMs < calculationWindow.endMs
  })
}

/**
 * COMPARADOR: monta UM SimulationInput a partir das doses JÁ FILTRADAS pela
 * janela/cutoff. Não chama Recurrence, não consulta dataset, não muta o Scenario,
 * não encaminha automaticamente todas as doses persistidas.
 */
export function assembleScenarioInputs(
  scenario: Scenario,
  nowMs: number,
  relevantDoses: ReadonlyArray<Dose>,
): SimulationInput {
  const simulationDoses: SimulationDose[] = relevantDoses.map((dose) => ({
    id: dose.id,
    amountMg: dose.amountMg,
    timeMs: instantIsoToEpochMs(dose.time),
  }))

  return {
    halfLifeMs: scenario.selectedPkParameters.halfLifeMs,
    tmaxMs: scenario.selectedPkParameters.tmaxMs,
    doses: simulationDoses,
    nowMs,
  }
}

function validateProtocolInvariants(protocol: Protocol): DomainError[] {
  const errors: DomainError[] = []

  if (!Array.isArray(protocol.components) || protocol.components.length === 0) {
    errors.push(domainError('COMPONENT_PROPORTION_INVALID'))
    return errors
  }
  if (protocol.components.length > SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX) {
    errors.push(domainError('PROTOCOL_COMPONENT_LIMIT_EXCEEDED', {
      components: protocol.components.length,
      max: SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX,
    }))
  }

  for (const component of protocol.components) {
    if (!Number.isFinite(component.proportion) || component.proportion <= 0) {
      errors.push(domainError('COMPONENT_PROPORTION_INVALID', { componentId: component.id }))
    }
  }

  const proportions = protocol.components.map((component) => component.proportion)
  if (proportions.every((p) => Number.isFinite(p) && p > 0) && !proportionSumClose(proportions)) {
    errors.push(domainError('COMPONENT_PROPORTIONS_MUST_SUM_ONE'))
  }

  if (
    !Number.isFinite(protocol.totalDoseMg) ||
    protocol.totalDoseMg <= 0 ||
    protocol.totalDoseMg > SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX
  ) {
    errors.push(domainError('PROTOCOL_TOTAL_DOSE_INVALID', { totalDoseMg: protocol.totalDoseMg }))
  }

  return errors
}

/**
 * PROTOCOLOS: EXATAMENTE UM SimulationInput POR COMPONENTE (proibidas médias).
 * componentDoseMg_i = totalDoseMg × proportion_i (derivada, nunca persistida) e deve
 * permanecer finite>0≤SIMULATION_DOSE_MG_MAX. IDs determinísticos por composição
 * protocolId/componentId/instantMs — sem Math.random nem UUID.
 */
export function assembleProtocolInputs(
  protocol: Protocol,
  occurrences: ReadonlyArray<Occurrence>,
): Result<Array<{ componentId: string; input: SimulationInput }>, DomainError[]> {
  const invariantErrors = validateProtocolInvariants(protocol)
  if (invariantErrors.length > 0) {
    return { ok: false, error: invariantErrors }
  }

  const inputs: Array<{ componentId: string; input: SimulationInput }> = []

  for (const component of protocol.components) {
    const componentDoseMg = protocol.totalDoseMg * component.proportion
    if (
      !Number.isFinite(componentDoseMg) ||
      componentDoseMg <= 0 ||
      componentDoseMg > SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX
    ) {
      return {
        ok: false,
        error: [
          domainError('PROTOCOL_TOTAL_DOSE_INVALID', {
            componentId: component.id,
            componentDoseMg,
          }),
        ],
      }
    }

    const params: SelectedPkParameters = component.selectedPkParameters
    const simulationDoses: SimulationDose[] = occurrences.map((occurrence) => ({
      id: `${protocol.id}:${component.id}:${occurrence.instantMs}`,
      amountMg: componentDoseMg,
      timeMs: occurrence.instantMs,
    }))

    inputs.push({
      componentId: component.id,
      input: {
        halfLifeMs: params.halfLifeMs,
        tmaxMs: params.tmaxMs,
        doses: simulationDoses,
        nowMs:
          occurrences.length > 0
            ? occurrences.reduce((max, occurrence) => Math.max(max, occurrence.instantMs), occurrences[0]!.instantMs)
            : 0,
      },
    })
  }

  return ok(inputs)
}
