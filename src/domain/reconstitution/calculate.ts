import { RECONSTITUTION_ENGINE_VERSION } from '../version'
import { domainError, type DomainError } from '../shared/errors'
import { ok, type Result } from '../shared/result'
import { UX_LIMITS } from '../../validation/limits'
import { SAFETY_LIMITS } from '../../validation/limits'
import type { ReconstitutionInput, ReconstitutionResult } from '../types'

// Motor de reconstituição INDEPENDENTE (§8): matemática pura, sem orientação clínica.
// Não conhece PK/Recurrence. Arredondamento somente na apresentação (features).

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * calculateReconstitution(input): Result<ReconstitutionResult, DomainError[]>
 * DOSE_EXCEEDS_VIAL_CONTENT é BLOQUEANTE — nenhum resultado "realizável" é retornado.
 */
export function calculateReconstitution(
  input: ReconstitutionInput,
): Result<ReconstitutionResult, DomainError[]> {
  const errors: DomainError[] = []

  if (!isPositiveFinite(input.vialMassMg) || input.vialMassMg > SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX) {
    errors.push(domainError('INVALID_RECONSTITUTION_INPUT', { field: 'vialMassMg' }))
  }
  if (
    !isPositiveFinite(input.diluentVolumeMl) ||
    input.diluentVolumeMl > SAFETY_LIMITS.RECON_DILUENT_ML_MAX
  ) {
    errors.push(domainError('INVALID_RECONSTITUTION_INPUT', { field: 'diluentVolumeMl' }))
  }
  if (!isPositiveFinite(input.desiredDoseMcg) || input.desiredDoseMcg > SAFETY_LIMITS.RECON_DOSE_MCG_MAX) {
    errors.push(domainError('INVALID_RECONSTITUTION_INPUT', { field: 'desiredDoseMcg' }))
  }

  const syringe = input.syringe
  if (
    syringe === undefined ||
    syringe.family !== 'U-100' ||
    !isPositiveFinite(syringe.capacityUnits) ||
    syringe.unitsPerMl !== 100
  ) {
    errors.push(domainError('INVALID_RECONSTITUTION_INPUT', { field: 'syringe' }))
  } else if (
    !isPositiveFinite(syringe.graduationUnits) ||
    syringe.graduationUnits > SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX
  ) {
    errors.push(domainError('INVALID_RECONSTITUTION_INPUT', { field: 'graduationUnits' }))
  }

  if (errors.length > 0) {
    return { ok: false, error: errors }
  }

  const totalMcg = input.vialMassMg * 1000
  if (input.desiredDoseMcg > totalMcg) {
    return {
      ok: false,
      error: [
        domainError('DOSE_EXCEEDS_VIAL_CONTENT', {
          desiredDoseMcg: input.desiredDoseMcg,
          vialTotalMcg: totalMcg,
        }),
      ],
    }
  }

  const concentrationMcgPerMl = totalMcg / input.diluentVolumeMl
  const doseVolumeMl = input.desiredDoseMcg / concentrationMcgPerMl
  const syringeUnits = doseVolumeMl * input.syringe.unitsPerMl
  const theoreticalMaxDoses = Math.floor(totalMcg / input.desiredDoseMcg)
  const capacityExceeded = syringeUnits > input.syringe.capacityUnits

  const warnings: ReconstitutionResult['warnings'] = []
  if (capacityExceeded) {
    warnings.push('CAPACITY_EXCEEDED')
  }

  // LOW_SYRINGE_PRECISION sse erroRel > threshold (ESTRITO; no limite exato de 5% não há alerta).
  const relativeError = (0.5 * input.syringe.graduationUnits) / syringeUnits
  if (relativeError > UX_LIMITS.GRADUATION_ERROR_WARN_THRESHOLD) {
    warnings.push('LOW_SYRINGE_PRECISION')
  }

  warnings.push('THEORETICAL_YIELD')

  return ok({
    concentrationMcgPerMl,
    doseVolumeMl,
    syringeUnits,
    theoreticalMaxDoses,
    capacityExceeded,
    warnings,
    metadata: { reconstitutionEngineVersion: RECONSTITUTION_ENGINE_VERSION },
  })
}
