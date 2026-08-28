import type { RecurrenceInvalidReason } from '../../domain/recurrence/validate'
import type { DataManagementError, DataManagementErrorCode, DomainError, DomainErrorCode } from '../../domain/shared/errors'
import type { PkWarningCode, ReconstitutionWarningCode } from '../../domain/types'

// Catálogo normativo ÚNICO de mensagens e textos de apresentação pt-BR (§6, §7, §8, §13).
// Proibido espalhar textos pt-BR de apresentação fora deste módulo.

export const messages = {
  appName: 'FARMakit',
  navLabel: 'Navegação principal',
  nav: {
    biblioteca: 'Biblioteca',
    meiaVida: 'Meia-vida',
    reconstituir: 'Reconstituir',
    protocolos: 'Protocolos',
    historico: 'Histórico',
    ajustes: 'Ajustes',
  },
  pages: {
    biblioteca: 'Biblioteca — implementação prevista na E10.',
    meiaVida: 'Meia-vida (Comparador) — implementação prevista na E9.',
    reconstituir:
      'Cálculo matemático de reconstituição e conversão de volume a partir dos valores informados. A FARMakit não define dose nem substitui orientação profissional.',
    protocolos: 'Protocolos — implementação prevista na E11.',
    historico: 'Histórico — implementação prevista na E12.',
    ajustes: 'Ajustes — implementação prevista na E6/E13.',
    spike: 'Spike técnico da E1 — dados fictícios; nenhum gráfico farmacocinético.',
    naoEncontrada: 'Página não encontrada.',
  },
  reconstitution: {
    description:
      'O cálculo parte da dose informada pelo usuário. Não define dose, não é orientação de preparo e não substitui orientação profissional.',
    formTitle: 'Parâmetros informados',
    identificationLabel: 'Identificação',
    identificationHelper: 'Opcional. Serve apenas para identificar este cálculo.',
    vialMassLabel: 'Quantidade no frasco',
    vialMassUnit: 'mg',
    vialMassHelper: 'Informe a quantidade de massa contida no frasco.',
    diluentLabel: 'Volume de diluente',
    diluentUnit: 'mL',
    diluentHelper: 'Informe o volume de diluente considerado no cálculo.',
    doseLabel: 'Dose informada',
    doseUnit: 'mcg',
    doseHelper: 'Valor informado pelo usuário; a FARMakit não define a dose.',
    syringeFamilyLabel: 'Família de seringa',
    syringeFamilyValue: 'U-100',
    syringeCapacityLabel: 'Capacidade da seringa',
    syringeCapacityUnit: 'U',
    syringeCapacityOptions: {
      thirty: '30 U (0,3 mL)',
      fifty: '50 U (0,5 mL)',
      oneHundred: '100 U (1,0 mL)',
    },
    syringeGraduationLabel: 'Graduação da seringa',
    syringeGraduationUnit: 'U',
    syringeGraduationHelper: 'Aceita valores decimais, como 0,5.',
    invalidNumber: 'Informe um número válido.',
    clear: 'Limpar',
    emptyState: 'Preencha os valores para visualizar o cálculo automaticamente.',
    resultTitle: 'Resultado calculado',
    mainResultLabel: 'Equivalência U-100',
    mainResultUnit: 'seringa U-100',
    doseResultLabel: 'Dose informada',
    concentrationResultLabel: 'Concentração calculada',
    volumeResultLabel: 'Volume correspondente',
    capacityResultLabel: 'Capacidade selecionada',
    yieldResultLabel: 'Rendimento teórico máximo',
    completeDosesSuffix: 'doses completas',
    unitsSuffix: 'U',
    mcgPerMlSuffix: 'mcg/mL',
    mlSuffix: 'mL',
    copyTitle: 'FARMakit — Reconstituição',
    copyIdentificationLabel: 'Identificação',
    copyVialLabel: 'Conteúdo do frasco',
    copyDiluentLabel: 'Volume de diluente',
    copyDoseLabel: 'Dose informada',
    copyConcentrationLabel: 'Concentração calculada',
    copyVolumeLabel: 'Volume correspondente',
    copyUnitsLabel: 'Equivalência U-100',
    copyCapacityLabel: 'Capacidade selecionada',
    copyYieldLabel: 'Rendimento teórico máximo',
    copyWarningsLabel: 'Avisos:',
    historyTitle: (label: string) => label ? `Reconstituição — ${label}` : 'Reconstituição',
    calculatedUnits: (units: string) => `${units} U calculadas`,
    capacitySelected: (capacity: string) => `capacidade selecionada: ${capacity} U`,
    theoreticalYieldExplanation:
      'O rendimento teórico representa o número máximo ideal de doses completas, sem considerar perdas residuais.',
    warningsTitle: 'Avisos e informações',
    copy: 'Copiar',
    copied: 'Copiado',
    copyFailure: 'Não foi possível copiar',
    save: 'Salvar no histórico',
    saving: 'Salvando…',
    saveSuccess: 'Registro salvo no histórico.',
    saveSessionSuccess:
      'Salvo no histórico desta sessão. A persistência está desativada; o registro não será mantido após encerrar ou recarregar a aplicação.',
    saveDegradedSuccess:
      'Registro mantido apenas nesta sessão. A persistência está temporariamente indisponível; o registro pode não ser mantido após encerrar ou recarregar a aplicação.',
    saveEviction: (count: number) =>
      ` ${count} ${count === 1 ? 'registro antigo foi removido' : 'registros antigos foram removidos'} para respeitar os limites de armazenamento.`,
    saveFailure: 'Não foi possível salvar este registro no histórico.',
    savingFailure: 'Não foi possível salvar este registro no histórico.',
    storageErrorDetails: (message: string) => `Não foi possível salvar este registro no histórico. ${message}`,
    gaugeLabel: 'Medidor da equivalência calculada',
    gaugeValueText: (units: string, capacity: string) =>
      `Equivalência calculada: ${units} unidades. Capacidade selecionada: ${capacity} unidades.`,
    gaugeScaleLabel: 'Escala da capacidade selecionada',
    alertTitle: 'Não foi possível apresentar um resultado realizável.',
    fieldErrorLabel: (label: string) => `Erro em ${label}`,
  },
} as const

export type Messages = typeof messages

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

export const validationMessages = {
  finiteNumber: 'Deve ser um número finito',
  positiveFiniteNumber: 'Deve ser um número positivo maior que zero',
  nonNegativeFiniteNumber: 'Deve ser um número não negativo',
  positiveInteger: 'Deve ser um número inteiro positivo',
  nonEmptyText: 'Texto não pode ser vazio',
  nameRequired: 'Nome é obrigatório',
  nameMaxLength: (max: number) => `Nome deve ter no máximo ${max} caracteres`,
  nameNonWhitespace: 'Nome não pode ser vazio ou conter apenas espaços',
  isoInstantInvalid: 'Data/hora ISO inválida',
  localDateInvalid: 'Data civil inválida (formato YYYY-MM-DD)',
  localTimeInvalid: 'Horário civil inválido (formato HH:MM)',
  timeZoneIdInvalid: 'Identificador de fuso horário inválido',
  durationRangeMinMax: 'O valor mínimo da duração não pode ser maior que o valor máximo',
  halfLifeRange: (minMs: number, maxDays: number) => `Meia-vida deve estar entre ${minMs} ms e ${maxDays} dias`,
  tmaxRange: (maxDays: number) => `Tmax deve ser nulo ou estar entre 0 e ${maxDays} dias`,
  weekdaysEmpty: 'Selecione ao menos um dia da semana',
  weekdaysMax: 'Máximo de 7 dias da semana',
  weekdaysCanonical: 'Dias da semana devem ser únicos e ordenados de forma crescente',
  weeksInteger: 'A duração em semanas deve ser um número inteiro',
  weeksMin: 'A duração em semanas deve ser de no mínimo 1',
  weeksMax: (max: number) => `A duração em semanas deve ser de no máximo ${max}`,
  doseAmountRange: (maxMg: number) => `Quantidade da dose deve ser maior que zero e até ${maxMg} mg`,
  colorRequired: 'Cor é obrigatória',
  dosesPerScenarioMax: (max: number) => `Máximo de ${max} doses por cenário`,
  protocolTotalDoseRange: (maxMg: number) => `Dose total do protocolo deve ser maior que zero e até ${maxMg} mg`,
  protocolComponentsMin: 'Protocolo deve ter ao menos 1 componente',
  protocolComponentsMax: (max: number) => `Um protocolo pode ter no máximo ${max} componentes.`,
  protocolDuplicateComponentId: (id: string) => `ID de componente duplicado: ${id}`,
  protocolComponentProportionInvalid: 'Cada componente deve ter uma proporção numérica maior que zero.',
  protocolComponentProportionsSumOne: 'A soma das proporções dos componentes deve ser 1.',
  protocolDerivedDoseInvalid: (id: string, dose: number) => `Dose derivada do componente ${id} inválida: ${dose}`,
  syringeGraduationRange: (max: number) => `Graduação da seringa deve ser maior que zero e até ${max} U`,
  vialMassRange: (maxMg: number) => `Massa do frasco deve ser maior que zero e até ${maxMg} mg`,
  diluentVolumeRange: (maxMl: number) => `Volume de diluente deve ser maior que zero e até ${maxMl} mL`,
  desiredDoseRange: (maxMcg: number) => `Dose desejada deve ser maior que zero e até ${maxMcg} mcg`,
} as const

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
