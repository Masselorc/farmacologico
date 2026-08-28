import { messages, validationMessages } from '../../../app/i18n/pt-BR.messages'
import { parseLocaleDecimal } from '../../../domain/units/decimal'
import type { ReconstitutionInput } from '../../../domain/types'
import { UX_LIMITS } from '../../../validation/limits'
import { reconstitutionInputSchema } from '../../../validation/schemas/reconstitution'

export interface ReconstitutionDraft {
  label: string
  vialMassMg: string
  diluentVolumeMl: string
  desiredDoseMcg: string
  capacityUnits: '30' | '50' | '100'
  graduationUnits: string
}

export type ReconstitutionDraftField = keyof ReconstitutionDraft

export const INITIAL_RECONSTITUTION_DRAFT: ReconstitutionDraft = {
  label: '',
  vialMassMg: '',
  diluentVolumeMl: '',
  desiredDoseMcg: '',
  capacityUnits: '100',
  graduationUnits: '1',
}

export const CAPACITY_OPTIONS = [
  { value: '30', label: messages.reconstitution.syringeCapacityOptions.thirty },
  { value: '50', label: messages.reconstitution.syringeCapacityOptions.fifty },
  { value: '100', label: messages.reconstitution.syringeCapacityOptions.oneHundred },
] as const

export interface ParsedReconstitutionDraft {
  input?: ReconstitutionInput
  fieldErrors: Partial<Record<ReconstitutionDraftField, string>>
  complete: boolean
}

function parseNumericField(
  value: string,
  fieldErrors: Partial<Record<ReconstitutionDraftField, string>>,
  field: ReconstitutionDraftField,
): number | undefined {
  const parsed = parseLocaleDecimal(value)
  if (!parsed.ok) {
    fieldErrors[field] = messages.reconstitution.invalidNumber
    return undefined
  }
  return parsed.value
}

function mapSchemaField(path: readonly PropertyKey[]): ReconstitutionDraftField | undefined {
  const first = path[0]
  if (first === 'vialMassMg' || first === 'diluentVolumeMl' || first === 'desiredDoseMcg' || first === 'label') {
    return first
  }
  if (first === 'syringe') {
    const nested = path[1]
    if (nested === 'graduationUnits') return 'graduationUnits'
    if (nested === 'capacityUnits') return 'capacityUnits'
  }
  return undefined
}

/**
 * Converte o draft textual em input de domínio somente depois do parsing pt-BR
 * e da validação do schema. O estado do formulário permanece textual.
 */
export function parseReconstitutionDraft(draft: ReconstitutionDraft): ParsedReconstitutionDraft {
  const fieldErrors: Partial<Record<ReconstitutionDraftField, string>> = {}
  const vialMassMg = parseNumericField(draft.vialMassMg, fieldErrors, 'vialMassMg')
  const diluentVolumeMl = parseNumericField(draft.diluentVolumeMl, fieldErrors, 'diluentVolumeMl')
  const desiredDoseMcg = parseNumericField(draft.desiredDoseMcg, fieldErrors, 'desiredDoseMcg')
  const graduationUnits = parseNumericField(draft.graduationUnits, fieldErrors, 'graduationUnits')

  if (draft.label.length > UX_LIMITS.NAME_MAX_CHARS) {
    fieldErrors.label = validationMessages.nameMaxLength(UX_LIMITS.NAME_MAX_CHARS)
  }

  if (
    vialMassMg === undefined ||
    diluentVolumeMl === undefined ||
    desiredDoseMcg === undefined ||
    graduationUnits === undefined ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { fieldErrors, complete: false }
  }

  const candidate: ReconstitutionInput = {
    vialMassMg,
    diluentVolumeMl,
    desiredDoseMcg,
    syringe: {
      family: 'U-100',
      capacityUnits: Number(draft.capacityUnits),
      unitsPerMl: 100,
      graduationUnits,
    },
    ...(draft.label.trim() ? { label: draft.label.trim() } : {}),
  }

  const parsed = reconstitutionInputSchema.safeParse(candidate)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = mapSchemaField(issue.path)
      if (field && fieldErrors[field] === undefined) {
        fieldErrors[field] = issue.message
      }
    }
    return { fieldErrors, complete: false }
  }

  return { input: parsed.data, fieldErrors, complete: true }
}
