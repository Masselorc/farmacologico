import { formatReconstitutionWarning, messages } from '../../../app/i18n/pt-BR.messages'
import type { ReconstitutionInput, ReconstitutionResult, ReconstitutionWarningCode } from '../../../domain/types'

const numberFormatters = new Map<string, Intl.NumberFormat>()

function getNumberFormatter(maximumFractionDigits: number, useGrouping: boolean): Intl.NumberFormat {
  const key = `${maximumFractionDigits}:${useGrouping ? 'grouped' : 'plain'}`
  const existing = numberFormatters.get(key)
  if (existing) return existing

  const formatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping,
  })
  numberFormatters.set(key, formatter)
  return formatter
}

export function formatReconstitutionNumber(
  value: number,
  maximumFractionDigits = 3,
  useGrouping = true,
): string {
  return getNumberFormatter(maximumFractionDigits, useGrouping).format(value)
}

export function formatReconstitutionWarningText(
  code: ReconstitutionWarningCode,
  input: ReconstitutionInput,
  result: ReconstitutionResult,
): string {
  if (code === 'CAPACITY_EXCEEDED') {
    return formatReconstitutionWarning(code, {
      syringeUnits: formatReconstitutionNumber(result.syringeUnits, 3, false),
      capacityUnits: formatReconstitutionNumber(input.syringe.capacityUnits, 3, false),
    })
  }
  return formatReconstitutionWarning(code)
}

export function buildReconstitutionCopyText(
  input: ReconstitutionInput,
  result: ReconstitutionResult,
): string {
  const lines = [
    messages.reconstitution.copyTitle,
    ...(input.label ? [`${messages.reconstitution.copyIdentificationLabel}: ${input.label}`] : []),
    `${messages.reconstitution.copyVialLabel}: ${formatReconstitutionNumber(input.vialMassMg, 3, false)} ${messages.reconstitution.vialMassUnit}`,
    `${messages.reconstitution.copyDiluentLabel}: ${formatReconstitutionNumber(input.diluentVolumeMl, 6, false)} ${messages.reconstitution.mlSuffix}`,
    `${messages.reconstitution.copyDoseLabel}: ${formatReconstitutionNumber(input.desiredDoseMcg, 3, false)} ${messages.reconstitution.doseUnit}`,
    `${messages.reconstitution.copyConcentrationLabel}: ${formatReconstitutionNumber(result.concentrationMcgPerMl, 3, false)} ${messages.reconstitution.mcgPerMlSuffix}`,
    `${messages.reconstitution.copyVolumeLabel}: ${formatReconstitutionNumber(result.doseVolumeMl, 6, false)} ${messages.reconstitution.mlSuffix}`,
    `${messages.reconstitution.copyUnitsLabel}: ${formatReconstitutionNumber(result.syringeUnits, 3, false)} ${messages.reconstitution.unitsSuffix}`,
    `${messages.reconstitution.copyCapacityLabel}: ${formatReconstitutionNumber(input.syringe.capacityUnits, 3, false)} ${messages.reconstitution.unitsSuffix}`,
    `${messages.reconstitution.copyYieldLabel}: ${formatReconstitutionNumber(result.theoreticalMaxDoses, 3, false)} ${messages.reconstitution.completeDosesSuffix}`,
    messages.reconstitution.copyWarningsLabel,
    ...result.warnings.map((warning) => `- ${formatReconstitutionWarningText(warning, input, result)}`),
  ]

  return lines.join('\n')
}
