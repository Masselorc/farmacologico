import { describe, expect, it } from 'vitest'
import {
  buildReconstitutionCopyText,
  formatReconstitutionNumber,
  formatReconstitutionWarningText,
} from '../../../features/reconstitution/lib/presentation'
import type { ReconstitutionInput, ReconstitutionResult } from '../../../domain/types'
import { RECONSTITUTION_ENGINE_VERSION } from '../../../domain/version'

describe('Reconstitution presentation — formatação pt-BR e copy', () => {
  const baseInput: ReconstitutionInput = {
    vialMassMg: 5,
    diluentVolumeMl: 2,
    desiredDoseMcg: 250,
    syringe: {
      family: 'U-100',
      capacityUnits: 100,
      unitsPerMl: 100,
      graduationUnits: 1,
    },
    label: 'Enantato',
  }

  const baseResult: ReconstitutionResult = {
    concentrationMcgPerMl: 2500,
    doseVolumeMl: 0.1,
    syringeUnits: 10,
    theoreticalMaxDoses: 20,
    capacityExceeded: false,
    warnings: ['THEORETICAL_YIELD'],
    metadata: { reconstitutionEngineVersion: RECONSTITUTION_ENGINE_VERSION },
  }

  describe('formatReconstitutionNumber', () => {
    it('formata números com agrupamento por padrão', () => {
      expect(formatReconstitutionNumber(2500)).toBe('2.500')
      expect(formatReconstitutionNumber(1000000)).toBe('1.000.000')
      expect(formatReconstitutionNumber(0.1, 6)).toBe('0,1')
    })

    it('formata números sem agrupamento quando solicitado', () => {
      expect(formatReconstitutionNumber(2500, 3, false)).toBe('2500')
      expect(formatReconstitutionNumber(100.5, 3, false)).toBe('100,5')
      expect(formatReconstitutionNumber(106.66666666666667, 3, false)).toBe('106,667')
    })
  })

  describe('formatReconstitutionWarningText', () => {
    it('formata CAPACITY_EXCEEDED com números inteiros em pt-BR', () => {
      const input: ReconstitutionInput = { ...baseInput, desiredDoseMcg: 3000 }
      const result: ReconstitutionResult = {
        ...baseResult,
        syringeUnits: 120,
        capacityExceeded: true,
        warnings: ['CAPACITY_EXCEEDED', 'THEORETICAL_YIELD'],
      }

      const warningText = formatReconstitutionWarningText('CAPACITY_EXCEEDED', input, result)
      expect(warningText).toContain('120 U')
      expect(warningText).toContain('100 U')
      expect(warningText).toBe(
        'Com os parâmetros informados, a dose corresponde a 120 U e excede a capacidade selecionada de 100 U. Reduzir as unidades por dose exige maior concentração da solução. Revise os parâmetros informados ou a capacidade selecionada.',
      )
    })

    it('formata CAPACITY_EXCEEDED com decimais e sem cauda binária IEEE-754', () => {
      const input: ReconstitutionInput = { ...baseInput, desiredDoseMcg: 1600 }
      const result: ReconstitutionResult = {
        ...baseResult,
        syringeUnits: 106.66666666666667,
        capacityExceeded: true,
        warnings: ['CAPACITY_EXCEEDED', 'THEORETICAL_YIELD'],
      }

      const warningText = formatReconstitutionWarningText('CAPACITY_EXCEEDED', input, result)
      expect(warningText).toContain('106,667 U')
      expect(warningText).not.toContain('106.66666666666667')
      expect(warningText).not.toContain('106.667')
    })

    it('formata CAPACITY_EXCEEDED com decimal simples usando vírgula pt-BR', () => {
      const input: ReconstitutionInput = { ...baseInput, desiredDoseMcg: 2010 }
      const result: ReconstitutionResult = {
        ...baseResult,
        syringeUnits: 100.5,
        capacityExceeded: true,
        warnings: ['CAPACITY_EXCEEDED', 'THEORETICAL_YIELD'],
      }

      const warningText = formatReconstitutionWarningText('CAPACITY_EXCEEDED', input, result)
      expect(warningText).toContain('100,5 U')
      expect(warningText).not.toContain('100.5 U')
    })

    it('retorna texto estático para warnings sem parâmetros', () => {
      expect(formatReconstitutionWarningText('LOW_SYRINGE_PRECISION', baseInput, baseResult)).toBe(
        'A dose calculada requer precisão inferior à graduação da seringa selecionada.',
      )
      expect(formatReconstitutionWarningText('THEORETICAL_YIELD', baseInput, baseResult)).toBe(
        'O rendimento teórico indica o número máximo ideal de doses sem considerar perdas residuais.',
      )
    })
  })

  describe('buildReconstitutionCopyText', () => {
    it('gera texto de cópia estruturado com números e warnings localizados', () => {
      const input: ReconstitutionInput = {
        vialMassMg: 3,
        diluentVolumeMl: 2,
        desiredDoseMcg: 1600,
        syringe: {
          family: 'U-100',
          capacityUnits: 100,
          unitsPerMl: 100,
          graduationUnits: 1,
        },
        label: 'Peptídeo',
      }
      const result: ReconstitutionResult = {
        concentrationMcgPerMl: 1500,
        doseVolumeMl: 1.0666666666666667,
        syringeUnits: 106.66666666666667,
        theoreticalMaxDoses: 1,
        capacityExceeded: true,
        warnings: ['CAPACITY_EXCEEDED', 'THEORETICAL_YIELD'],
        metadata: { reconstitutionEngineVersion: RECONSTITUTION_ENGINE_VERSION },
      }

      const copy = buildReconstitutionCopyText(input, result)
      expect(copy).toContain('FARMakit — Reconstituição')
      expect(copy).toContain('Identificação: Peptídeo')
      expect(copy).toContain('Conteúdo do frasco: 3 mg')
      expect(copy).toContain('Volume de diluente: 2 mL')
      expect(copy).toContain('Dose informada: 1600 mcg')
      expect(copy).toContain('Concentração calculada: 1500 mcg/mL')
      expect(copy).toContain('Volume correspondente: 1,066667 mL')
      expect(copy).toContain('Equivalência U-100: 106,667 U')
      expect(copy).toContain('Capacidade selecionada: 100 U')
      expect(copy).toContain('Rendimento teórico máximo: 1 doses completas')
      expect(copy).toContain('Avisos:')
      expect(copy).toContain('- Com os parâmetros informados, a dose corresponde a 106,667 U e excede a capacidade selecionada de 100 U.')
      expect(copy).toContain('- O rendimento teórico indica o número máximo ideal de doses sem considerar perdas residuais.')
      expect(copy).not.toContain('106.66666666666667')
    })
  })
})
