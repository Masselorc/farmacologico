// Códigos normativos do catálogo de domínio (§6).
export type DomainErrorCode =
  | 'HALF_LIFE_NON_POSITIVE'
  | 'TMAX_NEGATIVE'
  | 'NO_DOSES'
  | 'INVALID_DOSE_AMOUNT'
  | 'INVALID_DOSE_TIME'
  | 'INVALID_HORIZON'
  | 'ABSORPTION_SOLVER_FAILURE'
  | 'SCENARIO_NAME_REQUIRED'
  | 'DOSE_EXCEEDS_VIAL_CONTENT'
  | 'INVALID_RECONSTITUTION_INPUT'
  | 'COMPONENT_PROPORTION_INVALID'
  | 'COMPONENT_PROPORTIONS_MUST_SUM_ONE'
  | 'PROTOCOL_COMPONENT_LIMIT_EXCEEDED'
  | 'NUMERIC_FAILURE'
  | 'PROTOCOL_TOTAL_DOSE_INVALID'

export interface DomainError {
  code: DomainErrorCode
  params?: Record<string, number | string>
}

export function domainError(code: DomainErrorCode, params?: Record<string, number | string>): DomainError {
  return params === undefined ? { code } : { code, params }
}

// Códigos normativos de Data Management (§6).
export type DataManagementErrorCode =
  | 'CONFIG_STORAGE_LIMIT_EXCEEDED'
  | 'CALCULATION_RECORD_TOO_LARGE'
  | 'EXPORT_SIZE_LIMIT_EXCEEDED'
  | 'IMPORT_FILE_TOO_LARGE'
  | 'IMPORT_KIND_MISMATCH'

export interface DataManagementError {
  code: DataManagementErrorCode
  params?: Record<string, number | string>
  /** Motivo interno não normativo; nunca substitui o catálogo público de códigos. */
  internalReason?: string
  validationDetails?: string
}

export function dataManagementError(
  code: DataManagementErrorCode,
  params?: Record<string, number | string>,
  diagnostics?: Pick<DataManagementError, 'internalReason' | 'validationDetails'>,
): DataManagementError {
  return {
    code,
    ...(params === undefined ? {} : { params }),
    ...(diagnostics || {}),
  }
}
