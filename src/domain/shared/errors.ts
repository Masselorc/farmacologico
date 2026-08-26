// Códigos normativos do catálogo de domínio (§6). Catálogo pt-BR completo pertence à E5;
// aqui apenas a representação estrutural {code, params}.
export type DomainErrorCode =
  | 'HALF_LIFE_NON_POSITIVE'
  | 'TMAX_NEGATIVE'
  | 'NO_DOSES'
  | 'INVALID_DOSE_AMOUNT'
  | 'INVALID_DOSE_TIME'
  | 'INVALID_HORIZON'
  | 'ABSORPTION_SOLVER_FAILURE'
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
