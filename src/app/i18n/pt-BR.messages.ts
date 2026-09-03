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
    meiaVida:
      'Compare cenários farmacocinéticos a partir dos parâmetros e doses informados, com análise temporal, métricas e visualização gráfica.',
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
  comparator: {
    title: 'Meia-vida (Comparador)',
    description:
      'Compare cenários farmacocinéticos a partir dos parâmetros e doses informados, com análise temporal, métricas e visualização gráfica.',
    timeZoneLabel: (tz: string) => `Fuso do calendário: ${tz}`,
    scenariosSectionTitle: 'Cenários',
    analysisSectionTitle: 'Análise e visualização',
    addScenario: 'Adicionar cenário',
    newScenarioTitle: 'Novo cenário',
    editScenarioTitle: 'Editar cenário',
    scenarioNameLabel: 'Nome do cenário',
    scenarioNamePlaceholder: 'Ex.: Substância A',
    scenarioColorLabel: 'Cor',
    halfLifeLabel: 'Meia-vida',
    halfLifeUnitLabel: 'Unidade da meia-vida',
    tmaxLabel: 'Tmax',
    tmaxUnitLabel: 'Unidade do Tmax',
    tmaxImmediate: '0 (Absorção imediata)',
    displayUnitLabel: 'Unidade de exibição',
    saveScenario: 'Salvar cenário',
    cancel: 'Cancelar',
    deleteScenario: 'Remover cenário',
    deleteScenarioConfirm: 'Deseja remover este cenário?',
    dosesTitle: 'Doses cadastradas',
    addDose: 'Adicionar dose',
    doseAmountLabel: 'Quantidade da dose',
    doseDateLabel: 'Data',
    doseTimeLabel: 'Hora',
    useCurrentTime: 'Usar horário atual',
    saveDose: 'Salvar dose',
    removeDose: 'Remover dose',
    noDoses: 'Nenhuma dose cadastrada para este cenário.',
    displayWindowSectionTitle: 'Janela de visualização',
    windowStartLabel: 'Início da janela',
    windowEndLabel: 'Fim da janela',
    invalidWindow: 'Janela de visualização inválida: o início deve ser anterior ao fim.',
    scaleToggleLabel: 'Escala',
    scaleAbsolute: 'Absoluta (mg)',
    scaleNormalized: 'Normalizada (%)',
    yAxisToggleLabel: 'Eixo Y',
    yAxisLinear: 'Linear',
    yAxisLog: 'Logarítmico',
    logClippedNotice: 'Alguns valores muito próximos de zero foram omitidos da geometria do gráfico logarítmico.',
    logZeroPeakNotice: (name: string) => `O cenário "${name}" não possui pico positivo e foi omitido do gráfico logarítmico.`,
    noContributingDoses: 'Nenhuma dose deste cenário contribui na janela de cálculo atual.',
    metricsTitle: 'Métricas do modelo',
    currentCentral: 'Quantidade central atual',
    currentDepot: 'Quantidade no depósito',
    eliminatedTotal: 'Eliminada acumulada',
    administeredCount: 'Administrações realizadas',
    plannedCount: 'Doses futuras na simulação',
    estimatedPeak: 'Pico estimado',
    peakTime: 'Horário do pico',
    phaseHintLabel: 'Indicação de fase do modelo',
    phaseHints: {
      awaiting_first_dose: 'Aguardando a primeira dose',
      absorbing_latest: 'Absorção em curso após a dose mais recente',
      awaiting_next_planned: 'Aguardando a próxima dose cadastrada',
      terminal_decline: 'Declínio terminal',
    },
    milestonesTitle: 'Marcos de declínio',
    milestonePercentage: 'Percentual do pico',
    milestoneTarget: 'Quantidade alvo',
    milestoneTime: 'Horário estimado',
    milestoneNotReached: 'Não atingido no horizonte analisado',
    modelDetailsTitle: 'Detalhes do modelo farmacocinético',
    modelDetailsParams: 'Parâmetros cinéticos',
    modelHalfLife: 'Meia-vida selecionada',
    modelTmax: 'Tmax selecionado',
    modelKe: 'Constante de eliminação (ke)',
    modelKa: 'Constante de absorção (ka)',
    modelTerminalHalfLife: 'Meia-vida terminal efetiva',
    modelCutoff: 'Limite de cutoff (44 meias-vidas)',
    modelEngineVersion: 'Versão do motor PK',
    modelEducationalDisclaimer:
      'Modelo farmacocinético monocompartimental simplificado com superposição linear e biodisponibilidade relativa unitária (F = 1). Os resultados representam quantidades estimadas no modelo e não correspondem a medições laboratoriais ou níveis séricos individuais.',
    saveAnalysis: 'Salvar análise no histórico',
    savingAnalysis: 'Salvando…',
    saveSuccess: 'Análise salva no histórico.',
    saveSessionSuccess:
      'Salvo no histórico desta sessão. A persistência está desativada; o registro não será mantido após encerrar ou recarregar a aplicação.',
    saveDegradedSuccess:
      'Registro mantido apenas nesta sessão. A persistência está temporariamente indisponível; o registro pode não ser mantido após encerrar ou recarregar a aplicação.',
    saveEviction: (count: number) =>
      ` ${count} ${count === 1 ? 'registro antigo foi removido' : 'registros antigos foram removidos'} para respeitar os limites de armazenamento.`,
    saveFailure: 'Não foi possível salvar esta análise no histórico.',
    recordTooLarge: 'Reduza a janela visual ou a quantidade de cenários e tente novamente.',
    scenariosMaxReached: (max: number) => `Limite máximo de ${max} cenários atingido.`,
    dosesMaxReached: (max: number) => `Limite máximo de ${max} doses por cenário atingido.`,
    chartAriaLabel: 'Gráfico comparativo de curvas farmacocinéticas ao longo do tempo',
    seriesLegend: 'Séries visualizadas',
    singleRecordTitle: (name: string) => `Análise farmacocinética — ${name}`,
    multiRecordTitle: (count: number) => `Comparador farmacocinético — ${count} cenários`,
    edit: 'Editar',
    remove: 'Remover',
    confirmDelete: 'Confirmar',
    dosesCount: (count: number) => `${count} ${count === 1 ? 'dose' : 'doses'}`,
    doseNumberHeader: '#',
    doseAmountHeader: 'Dose',
    doseDateTimeHeader: (tz: string) => `Data/Hora (${tz})`,
    doseActionsHeader: 'Ações',
    reviewDataTitle: 'Revise os dados:',
    saveScenarioError: 'Não foi possível salvar o cenário nas configurações.',
    deleteScenarioError: 'Não foi possível remover o cenário das configurações.',
    updateDosesError: 'Não foi possível atualizar as doses do cenário.',
    emptyAnalysisState: 'Nenhum cenário possui doses relevantes para a janela de visualização atual.',
    scenarioErrorsTitle: 'Não foi possível analisar os seguintes cenários:',
    editingDoseIndicator: (idx: number) => `Editando dose #${idx}`,
    perDay: '/ dia',
    timeUnitMinutes: 'minutos',
    timeUnitHours: 'horas',
    timeUnitDays: 'dias',
    massUnitMcg: 'mcg',
    massUnitMg: 'mg',
    massUnitG: 'g',
    colorOptionLabel: (idx: number, hex: string) => `Cor ${idx} (${hex})`,
    doseAmountPlaceholder: 'Ex.: 10',
    doseAmountInvalid: 'Informe uma quantidade de dose válida e maior que zero.',
    doseDateTimeInvalid: 'Data e hora inválidas.',
    configNotLoaded: 'Configuração não carregada.',
    saveError: 'Erro ao salvar.',
    loadingComparator: 'Carregando comparador…',
    halfLifeInvalid: 'A meia-vida deve ser maior que zero.',
    tmaxInvalid: 'O Tmax deve ser maior ou igual a zero (0 para absorção imediata).',
    scenarioNameRequired: 'Informe o nome do cenário.',
  },
  library: {
    title: 'Biblioteca',
    subtitle: 'Catálogo de substâncias e parâmetros farmacocinéticos de referência.',
    searchLabel: 'Buscar substâncias',
    searchPlaceholder: 'Nome, apelido ou categoria...',
    filterOriginLabel: 'Filtrar por origem:',
    filterAll: 'Todas as origens',
    filterLegacy: 'Legado sem fonte',
    filterLiterature: 'Fonte citada',
    filterUser: 'Criado por você',
    legacyBadge: 'Legado sem fonte',
    literatureBadge: 'Fonte citada',
    userBadge: 'Criado por você',
    singleKind: 'Fármaco simples',
    blendKind: 'Composição (Blend)',
    componentOnlyBadge: 'Componente exclusivo',
    compare: 'Comparar no Meia-vida',
    addToProtocols: 'Adicionar a Protocolos',
    blendComparatorUnavailable:
      'Composições (blends) são analisadas no módulo de Protocolos através de seus múltiplos componentes.',
    bioavailabilityDisclaimer:
      'Biodisponibilidade exibida apenas como metadado educacional (F relativo = 1 no modelo).',
    halfLifeLabel: 'Meia-vida:',
    tmaxLabel: 'Tmax:',
    tmaxInstant: 'Absorção instantânea (Tmax = 0)',
    routeLabel: 'Via de administração:',
    esterLabel: 'Éster:',
    formulationLabel: 'Formulação:',
    componentsTitle: 'Componentes da composição:',
    closeSheet: 'Fechar detalhes',
    rangeSelectionRequired: 'Selecione um valor dentro do intervalo para prosseguir:',
    rangeMinMax: (min: string, max: string) => `Faixa: de ${min} a ${max}`,
    noResults: 'Nenhuma substância encontrada para os critérios selecionados.',
    intentPreviewTitle: 'Ação preparada (transitória em memória):',
    intentPreviewNotice:
      'A integração direta entre módulos será ativada na etapa E12. O intent gerado não altera nem persiste dados de simulação ou protocolos.',
    profilesCount: (count: number) => `${count} perfil(is)`,
    viewDetails: (name: string) => `Ver detalhes de ${name}`,
    viewDetailsButton: 'Ver detalhes',
    proportionalComponents: (count: number) => `${count} componentes proporcionais`,
    proportionLabel: (percent: string, raw: number) => `Proporção: ${percent}% (${raw})`,
    unspecified: 'Não especificado',
    instantaneous: 'instantânea',
    rangeKind: 'faixa',
    enterValue: 'Informe um valor.',
    invalidNumber: 'Número inválido.',
    rangeAllowed: (min: string, max: string) => `Faixa permitida: ${min} a ${max}`,
    valueMustBeBetween: (min: string, max: string) => `O valor deve estar entre ${min} e ${max}.`,
    selectHalfLifeFromRange: 'Selecionar Meia-vida da faixa',
    selectTmaxFromRange: 'Selecionar Tmax da faixa',
    selectionRequiredAlert: 'Selecione os parâmetros obrigatórios antes de prosseguir.',
    tmaxUnknownOptionTitle: 'Definição do Tmax (não especificado na literatura):',
    tmaxUnknownProvideValue: 'Informar valor numérico',
    tmaxUnknownInstantOption: 'Absorção instantânea (Tmax = 0)',
    tmaxUnknownValueLabel: 'Valor do Tmax',
    bioavailabilityReference: (val: string) => `Biodisponibilidade de referência: ${val}`,
    bioavailabilityRange: (min: string, max: string) => `Biodisponibilidade de referência: ${min} a ${max}`,
  },
} as const

export type Messages = typeof messages

export type ErrorMessageTemplate = string | ((params?: Record<string, number | string>) => string)

const messageNumberFormatters = new Map<number, Intl.NumberFormat>()

function getMessageNumberFormatter(maximumFractionDigits: number): Intl.NumberFormat {
  const existing = messageNumberFormatters.get(maximumFractionDigits)
  if (existing) return existing

  const formatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: false,
  })
  messageNumberFormatters.set(maximumFractionDigits, formatter)
  return formatter
}

export function formatMessageNumber(
  value: number | string,
  maximumFractionDigits = 3,
): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return String(value)
  }
  return getMessageNumberFormatter(maximumFractionDigits).format(numeric)
}

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
      ? `A dose desejada (${formatMessageNumber(params.desiredDoseMcg)} mcg) excede a quantidade total do frasco (${formatMessageNumber(params.vialTotalMcg)} mcg).`
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

export function formatTimeUnit(unit: string): string {
  switch (unit) {
    case 'minutes':
      return messages.comparator.timeUnitMinutes
    case 'hours':
      return messages.comparator.timeUnitHours
    case 'days':
      return messages.comparator.timeUnitDays
    default:
      return unit
  }
}

export function formatDuration(duration: { value: number; unit: string }): string {
  return `${duration.value} ${formatTimeUnit(duration.unit)}`
}
