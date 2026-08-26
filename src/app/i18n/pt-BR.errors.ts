import type { RecurrenceInvalidReason } from '../../domain/recurrence/validate'
import type { DataManagementError, DataManagementErrorCode, DomainError, DomainErrorCode } from '../../domain/shared/errors'
import type { PkWarningCode, ReconstitutionWarningCode } from '../../domain/types'

// Catálogo centralizado e exaustivo de mensagens pt-BR de erros e warnings (§6, §7, §8).

export type ErrorMessageTemplate = string | ((params?: Record<string, number | string>) => string)

export const domainErrorMessages: Record<DomainErrorCode, ErrorMessageTemplate> = {
  HALF_LIFE_NON_POSITIVE: 'A meia-vida deve ser maior que zero.',
  TMAX_NEGATIVE: 'O Tmax deve ser maior ou igual a zero.',
  NO_DOSES: 'Cadastre pelo menos uma dose.',
  INVALID_DOSE_AMOUNT: (params) =>
    params?.doseNumber
      ? `Dose ${params.doseNumber}: informe uma quantidade maior que zero.`
      : 'Informe uma quantidade de dose maior que zero.',
  INVALID_DOSE_TIME: (params) =>
    params?.doseNumber
      ? `Dose ${params.doseNumber}: informe uma data e hora válidas.`
      : 'Informe uma data e hora válidas para a dose.',
  INVALID_HORIZON: 'Os parâmetros geraram um horizonte farmacocinético inválido.',
  ABSORPTION_SOLVER_FAILURE: 'O Tmax informado gera uma constante de absorção fora da faixa numérica do simulador.',
  SCENARIO_NAME_REQUIRED: 'Informe o nome da substância/cenário.',
  DOSE_EXCEEDS_VIAL_CONTENT: (params) =>
    params?.desiredDoseMcg !== undefined && params?.vialTotalMcg !== undefined
      ? `A dose desejada (${params.desiredDoseMcg} mcg) excede a quantidade total do frasco (${params.vialTotalMcg} mcg).`
      : 'A dose desejada excede o conteúdo total do frasco.',
  INVALID_RECONSTITUTION_INPUT: 'Os parâmetros de reconstituição informados são inválidos.',
  COMPONENT_PROPORTION_INVALID: 'Cada componente deve ter uma proporção numérica maior que zero.',
  COMPONENT_PROPORTIONS_MUST_SUM_ONE: 'A soma das proporções dos componentes deve ser 1.',
  PROTOCOL_COMPONENT_LIMIT_EXCEEDED: 'Um protocolo pode ter no máximo 20 componentes.',
  NUMERIC_FAILURE: 'Ocorreu uma falha numérica inesperada durante o cálculo.',
  PROTOCOL_TOTAL_DOSE_INVALID: 'A dose total do protocolo deve ser maior que zero e estar dentro do limite técnico permitido.',
}

export const dataManagementErrorMessages: Record<DataManagementErrorCode, ErrorMessageTemplate> = {
  CONFIG_STORAGE_LIMIT_EXCEEDED: 'O tamanho das configurações excede o limite de armazenamento suportado.',
  CALCULATION_RECORD_TOO_LARGE: 'O registro de cálculo excede o limite máximo permitido.',
  EXPORT_SIZE_LIMIT_EXCEEDED: 'O tamanho dos dados para exportação excede o limite permitido.',
  IMPORT_FILE_TOO_LARGE: 'O arquivo selecionado para importação excede o limite máximo permitido.',
  IMPORT_KIND_MISMATCH: 'O tipo do arquivo de importação não corresponde à ação selecionada.',
}

export const pkWarningMessages = {
  FLIP_FLOP_ABSORPTION:
    'Fenômeno flip-flop: o tempo até o pico (Tmax) é maior que o limiar crítico (T½/ln2), indicando que a constante de absorção (ka) é menor que a de eliminação (ke).',
  NEAR_DEGENERATE_RATES:
    'As constantes de absorção (ka) e eliminação (ke) estão muito próximas. O cálculo utiliza avaliação analítica estável contínua.',
  MILESTONE_NOT_REACHED:
    'Um ou mais marcos farmacocinéticos não foram atingidos dentro do horizonte de cálculo.',
  EXTREME_PARAMETERS:
    'Os parâmetros informados estão próximos aos limites operacionais do simulador.',
} as const satisfies Record<PkWarningCode, string>

export const reconstitutionWarningMessages = {
  CAPACITY_EXCEEDED: (params) =>
    params?.syringeUnits !== undefined && params?.capacityUnits !== undefined
      ? `Com os parâmetros informados, a dose corresponde a ${params.syringeUnits} U e excede a capacidade selecionada de ${params.capacityUnits} U. Reduzir as unidades por dose exige maior concentração da solução. Revise os parâmetros informados ou a capacidade selecionada.`
      : 'A dose calculada excede a capacidade da seringa selecionada.',
  LOW_SYRINGE_PRECISION:
    'A dose calculada requer precisão inferior à graduação da seringa selecionada.',
  THEORETICAL_YIELD:
    'O rendimento teórico indica o número máximo ideal de doses sem considerar perdas residuais.',
} as const satisfies Record<ReconstitutionWarningCode, ErrorMessageTemplate>

export const recurrenceReasonMessages = {
  INVALID_START_DATE: 'Data inicial inválida.',
  INVALID_LOCAL_TIME: 'Horário local inválido.',
  INVALID_TIME_ZONE: 'Fuso horário inválido.',
  EMPTY_WEEKDAYS: 'Selecione ao menos um dia da semana.',
  WEEKDAY_OUT_OF_RANGE: 'Dia da semana fora do intervalo permitido (1 a 7).',
  WEEKDAYS_NOT_ASCENDING_UNIQUE: 'Os dias da semana devem ser únicos e ordenados de forma crescente.',
  WEEKS_NOT_INTEGER: 'A duração em semanas deve ser um número inteiro.',
  WEEKS_OUT_OF_RANGE: 'A duração em semanas deve estar entre 1 e 520 semanas.',
} as const satisfies Record<RecurrenceInvalidReason, string>

// Formatadores puros para apresentação pt-BR (sem efeitos colaterais).

export function formatDomainError(error: DomainError): string {
  const template = domainErrorMessages[error.code]
  if (typeof template === 'function') {
    return template(error.params)
  }
  return template
}

export function formatDataManagementError(error: DataManagementError): string {
  const template: ErrorMessageTemplate = dataManagementErrorMessages[error.code]
  if (typeof template === 'function') {
    return template(error.params)
  }
  return template
}

export function formatPkWarning(code: PkWarningCode): string {
  return pkWarningMessages[code]
}

export function formatReconstitutionWarning(
  code: ReconstitutionWarningCode,
  params?: Record<string, number | string>,
): string {
  const template = reconstitutionWarningMessages[code]
  if (typeof template === 'function') {
    return template(params)
  }
  return template
}

export function formatRecurrenceReason(reason: RecurrenceInvalidReason): string {
  return recurrenceReasonMessages[reason]
}
