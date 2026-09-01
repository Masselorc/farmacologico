import { describe, expect, it } from 'vitest'
import {
  dataManagementErrorMessages,
  domainErrorMessages,
  formatDataManagementError,
  formatDomainError,
  formatMessageNumber,
  formatPkWarning,
  formatReconstitutionWarning,
  formatRecurrenceReason,
  messages,
  pkWarningMessages,
  reconstitutionWarningMessages,
  recurrenceReasonMessages,
  validationMessages,
} from '../../app/i18n/pt-BR.messages'
import type { RecurrenceInvalidReason } from '../../domain/recurrence/validate'
import { dataManagementError, type DataManagementErrorCode, domainError, type DomainErrorCode } from '../../domain/shared/errors'
import type { PkWarningCode, ReconstitutionWarningCode } from '../../domain/types'

describe('E5 i18n — Catálogo e formatadores pt-BR de erros e warnings (§6, §7, §8)', () => {
  describe('formatMessageNumber helper puro', () => {
    it('formata inteiros sem agrupamento de milhar', () => {
      expect(formatMessageNumber(6000)).toBe('6000')
      expect(formatMessageNumber(5000)).toBe('5000')
      expect(formatMessageNumber(0)).toBe('0')
    })

    it('formata decimais em pt-BR com vírgula e até 3 casas', () => {
      expect(formatMessageNumber(5001.5)).toBe('5001,5')
      expect(formatMessageNumber(5000.5)).toBe('5000,5')
      expect(formatMessageNumber(100.123)).toBe('100,123')
      expect(formatMessageNumber(100.1234)).toBe('100,123')
    })

    it('aceita strings numéricas e preserva valores não finitos', () => {
      expect(formatMessageNumber('5001.5')).toBe('5001,5')
      expect(formatMessageNumber('6000')).toBe('6000')
      expect(formatMessageNumber('invalid')).toBe('invalid')
      expect(formatMessageNumber(Number.NaN)).toBe('NaN')
    })
  })

  describe('Domain Errors catálogo e formatters', () => {
    const allDomainErrorCodes: DomainErrorCode[] = [
      'HALF_LIFE_NON_POSITIVE',
      'TMAX_NEGATIVE',
      'NO_DOSES',
      'INVALID_DOSE_AMOUNT',
      'INVALID_DOSE_TIME',
      'INVALID_HORIZON',
      'ABSORPTION_SOLVER_FAILURE',
      'SCENARIO_NAME_REQUIRED',
      'DOSE_EXCEEDS_VIAL_CONTENT',
      'INVALID_RECONSTITUTION_INPUT',
      'COMPONENT_PROPORTION_INVALID',
      'COMPONENT_PROPORTIONS_MUST_SUM_ONE',
      'PROTOCOL_COMPONENT_LIMIT_EXCEEDED',
      'NUMERIC_FAILURE',
      'PROTOCOL_TOTAL_DOSE_INVALID',
    ]

    it('possui mensagem mapeada para todos os 15 códigos normativos de domínio', () => {
      for (const code of allDomainErrorCodes) {
        expect(domainErrorMessages[code]).toBeDefined()
        const formatted = formatDomainError(domainError(code))
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      }
    })

    it('formata mensagens herdadas literalmente conforme especificação', () => {
      expect(formatDomainError(domainError('HALF_LIFE_NON_POSITIVE'))).toBe('A meia-vida deve ser maior que zero.')
      expect(formatDomainError(domainError('SCENARIO_NAME_REQUIRED'))).toBe('Informe o nome da substância/cenário.')
      expect(formatDomainError(domainError('NO_DOSES'))).toBe('Cadastre pelo menos uma dose.')
      expect(formatDomainError(domainError('INVALID_HORIZON'))).toBe('Os parâmetros geraram um horizonte farmacocinético inválido.')
      expect(formatDomainError(domainError('ABSORPTION_SOLVER_FAILURE'))).toBe(
        'O Tmax informado gera uma constante de absorção fora da faixa numérica do simulador.',
      )
      expect(formatDomainError(domainError('COMPONENT_PROPORTION_INVALID'))).toBe(
        'Cada componente deve ter uma proporção numérica maior que zero.',
      )
      expect(formatDomainError(domainError('COMPONENT_PROPORTIONS_MUST_SUM_ONE'))).toBe(
        'A soma das proporções dos componentes deve ser 1.',
      )
      expect(formatDomainError(domainError('PROTOCOL_COMPONENT_LIMIT_EXCEEDED'))).toBe(
        'Um protocolo pode ter no máximo 20 componentes.',
      )
      expect(formatDomainError(domainError('PROTOCOL_TOTAL_DOSE_INVALID'))).toBe(
        'A dose total do protocolo deve ser maior que zero e estar dentro do limite técnico permitido.',
      )
      expect(formatDomainError(domainError('PROTOCOL_TOTAL_DOSE_INVALID'))).not.toContain('limite seguro')
    })

    it('formata erros com parâmetros dinâmicos (doseNumber, doses/vial)', () => {
      expect(formatDomainError(domainError('INVALID_DOSE_AMOUNT', { doseNumber: 2 }))).toBe(
        'Dose 2: informe uma quantidade maior que zero.',
      )
      expect(formatDomainError(domainError('INVALID_DOSE_TIME', { doseNumber: 3 }))).toBe(
        'Dose 3: informe uma data e hora válidas.',
      )
      expect(formatDomainError(domainError('DOSE_EXCEEDS_VIAL_CONTENT', { desiredDoseMcg: 6000, vialTotalMcg: 5000 }))).toBe(
        'A dose desejada (6000 mcg) excede a quantidade total do frasco (5000 mcg).',
      )
      expect(formatDomainError(domainError('DOSE_EXCEEDS_VIAL_CONTENT', { desiredDoseMcg: 5001.5, vialTotalMcg: 5000 }))).toBe(
        'A dose desejada (5001,5 mcg) excede a quantidade total do frasco (5000 mcg).',
      )
      expect(formatDomainError(domainError('DOSE_EXCEEDS_VIAL_CONTENT', { desiredDoseMcg: 5000.5, vialTotalMcg: 5000 }))).toBe(
        'A dose desejada (5000,5 mcg) excede a quantidade total do frasco (5000 mcg).',
      )
    })
  })

  describe('Data Management Errors', () => {
    const allDataMgmtCodes: DataManagementErrorCode[] = [
      'CONFIG_STORAGE_LIMIT_EXCEEDED',
      'CALCULATION_RECORD_TOO_LARGE',
      'EXPORT_SIZE_LIMIT_EXCEEDED',
      'IMPORT_FILE_TOO_LARGE',
      'IMPORT_KIND_MISMATCH',
    ]

    it('possui mensagens para todos os códigos de Data Management', () => {
      for (const code of allDataMgmtCodes) {
        expect(dataManagementErrorMessages[code]).toBeDefined()
        const formatted = formatDataManagementError(dataManagementError(code))
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      }
    })
  })

  describe('PK Warnings catálogo e formatters', () => {
    const allPkWarningCodes: PkWarningCode[] = [
      'FLIP_FLOP_ABSORPTION',
      'NEAR_DEGENERATE_RATES',
      'MILESTONE_NOT_REACHED',
      'EXTREME_PARAMETERS',
    ]

    it('possui mensagens para todos os warnings PK', () => {
      for (const code of allPkWarningCodes) {
        expect(pkWarningMessages[code]).toBeDefined()
        const formatted = formatPkWarning(code)
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      }
    })

    it('contém a explicação educacional para FLIP_FLOP_ABSORPTION', () => {
      expect(formatPkWarning('FLIP_FLOP_ABSORPTION')).toContain('Fenômeno flip-flop')
    })
  })

  describe('Reconstitution Warnings catálogo e formatters', () => {
    const allReconWarningCodes: ReconstitutionWarningCode[] = [
      'CAPACITY_EXCEEDED',
      'LOW_SYRINGE_PRECISION',
      'THEORETICAL_YIELD',
    ]

    it('possui mensagens para todos os warnings de reconstituição', () => {
      for (const code of allReconWarningCodes) {
        expect(reconstitutionWarningMessages[code]).toBeDefined()
        const formatted = formatReconstitutionWarning(code)
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      }
    })

    it('formata CAPACITY_EXCEEDED com parâmetros quando fornecidos', () => {
      const formatted = formatReconstitutionWarning('CAPACITY_EXCEEDED', { syringeUnits: 120, capacityUnits: 100 })
      expect(formatted).toContain('120 U')
      expect(formatted).toContain('100 U')
    })
  })

  describe('Recurrence Invalid Reasons catálogo e formatters', () => {
    const allReasons: RecurrenceInvalidReason[] = [
      'INVALID_START_DATE',
      'INVALID_LOCAL_TIME',
      'INVALID_TIME_ZONE',
      'EMPTY_WEEKDAYS',
      'WEEKDAY_OUT_OF_RANGE',
      'WEEKDAYS_NOT_ASCENDING_UNIQUE',
      'WEEKS_NOT_INTEGER',
      'WEEKS_OUT_OF_RANGE',
    ]

    it('possui mensagens para todos os motivos de validação de recorrência', () => {
      for (const reason of allReasons) {
        expect(recurrenceReasonMessages[reason]).toBeDefined()
        const formatted = formatRecurrenceReason(reason)
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Validation messages e App Shell messages em pt-BR.messages (§6, §13)', () => {
    it('exporta validationMessages com mensagens puras de validação estrutural', () => {
      expect(validationMessages.finiteNumber).toBe('Deve ser um número finito')
      expect(validationMessages.positiveFiniteNumber).toBe('Deve ser um número positivo maior que zero')
      expect(validationMessages.protocolComponentProportionInvalid).toBe(
        'Cada componente deve ter uma proporção numérica maior que zero.',
      )
      expect(validationMessages.protocolComponentProportionsSumOne).toBe(
        'A soma das proporções dos componentes deve ser 1.',
      )
    })

    it('exporta mensagens de navegação e shell do aplicativo', () => {
      expect(messages.appName).toBe('FARMakit')
      expect(messages.nav.biblioteca).toBe('Biblioteca')
      expect(messages.nav.meiaVida).toBe('Meia-vida')
      expect(messages.nav.protocolos).toBe('Protocolos')
    })
  })
})
