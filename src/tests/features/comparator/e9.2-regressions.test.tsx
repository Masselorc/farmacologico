import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { paletteColorIdSchema } from '../../../validation/schemas/primitives'
import { isDomainError } from '../../../domain/shared/errors'
import { analyzeScenario } from '../../../features/comparator/lib/analysis'
import { DoseEditor } from '../../../features/comparator/components/DoseEditor'
import { ScenarioList } from '../../../features/comparator/components/ScenarioList'
import type { Scenario } from '../../../domain/types'

vi.mock('../../../features/charts/CompareChart', () => ({
  CompareChart: () => <div data-testid="mock-compare-chart" />,
}))

describe('E9.2 Regressions RED Phase', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Blocker 2 — PaletteColorId Schema Fechado', () => {
    it('aceita somente cores da paleta autorizada e rejeita strings arbitrárias', () => {
      // Cores autorizadas (moderna e legada)
      expect(paletteColorIdSchema.safeParse('#2563eb').success).toBe(true)
      expect(paletteColorIdSchema.safeParse('#9b59b6').success).toBe(true)

      // Cores arbitrárias DEVEM ser rejeitadas
      expect(paletteColorIdSchema.safeParse('#123456').success).toBe(false)
      expect(paletteColorIdSchema.safeParse('red').success).toBe(false)
      expect(paletteColorIdSchema.safeParse('blue-500').success).toBe(false)
      expect(paletteColorIdSchema.safeParse('').success).toBe(false)
    })
  })

  describe('Blocker 6 — Hardening de isDomainError', () => {
    it('rejeita códigos de erro arbitrários ou objetos inválidos', () => {
      expect(isDomainError({ code: 'TMAX_NEGATIVE' })).toBe(true)
      expect(isDomainError({ code: 'ABSORPTION_SOLVER_FAILURE' })).toBe(true)

      // Códigos desconhecidos/arbitrários NÃO são DomainError
      expect(isDomainError({ code: 'QUALQUER_COISA' })).toBe(false)
      expect(isDomainError(null)).toBe(false)
      expect(isDomainError(new Error('qualquer'))).toBe(false)
      expect(isDomainError({ code: 123 })).toBe(false)
      expect(isDomainError('string')).toBe(false)
    })
  })

  describe('Blocker 5 — Caso Real de ABSORPTION_SOLVER_FAILURE', () => {
    it('produz especificamente ABSORPTION_SOLVER_FAILURE com parâmetros numéricos reais', () => {
      const scenario: Scenario = {
        id: 'sc-solver-fail',
        name: 'Solver Fail Scenario',
        color: '#2563eb',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: {
          halfLifeMs: 1, // 1 ms -> ke muito alto
          tmaxMs: 86400000, // 24h -> c = ke * tmax enorme -> kaCandidate underflow
        },
        doses: [
          { id: 'd-1', amountMg: 10, time: '2026-09-01T12:00:00.000Z' },
        ],
      }

      const displayWindow = {
        startMs: 1788264000000 - 86400000,
        endMs: 1788264000000 + 86400000,
      }

      const result = analyzeScenario(scenario, displayWindow, 1788264000000, 'absolute', 'linear')
      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.error.code).toBe('ABSORPTION_SOLVER_FAILURE')
      }
    })
  })

  describe('Blocker 3 — CRUD de Doses Transacional', () => {
    const mockScenario: Scenario = {
      id: 'sc-crud',
      name: 'Cenário CRUD',
      color: '#2563eb',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: [
        { id: 'd-orig', amountMg: 10, time: '2026-09-01T12:00:00.000Z' },
      ],
    }

    it('ao falhar a mutação de edição de dose, preserva o draft e modo de edição', async () => {
      const onUpdateDoses = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Erro simulado no banco',
      })

      render(
        <DoseEditor
          scenario={mockScenario}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateDoses={onUpdateDoses}
        />,
      )

      // Clica em Editar
      fireEvent.click(screen.getByRole('button', { name: /^editar$/i }))

      // Altera valor de 10 para 25
      const amountInput = screen.getByLabelText(/quantidade da dose/i) as HTMLInputElement
      fireEvent.change(amountInput, { target: { value: '25' } })
      expect(amountInput.value).toBe('25')

      // Submete
      fireEvent.click(screen.getByRole('button', { name: /salvar dose/i }))

      await waitFor(() => {
        expect(onUpdateDoses).toHaveBeenCalled()
      })

      // Deve exibir mensagem de erro
      expect(await screen.findByText('Erro simulado no banco')).toBeTruthy()

      // O draft DEVE ser preservado (valor continua 25, não resetou para vazio nem 10)
      const inputAfter = screen.getByLabelText(/quantidade da dose/i) as HTMLInputElement
      expect(inputAfter.value).toBe('25')

      // Deve continuar em modo de edição (indicador de edição visível)
      expect(screen.getByText(/editando dose #1/i)).toBeTruthy()
    })

    it('ao falhar a exclusão de cenário em ScenarioList, não fecha confirmação e mantém cenário', async () => {
      const onDeleteScenario = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Falha ao deletar cenário',
      })

      render(
        <ScenarioList
          scenarios={[mockScenario]}
          activeScenarioId="sc-crud"
          onSelectScenario={vi.fn()}
          onEditScenario={vi.fn()}
          onDeleteScenario={onDeleteScenario}
          onAddNewScenario={vi.fn()}
          canAddScenario={true}
        />,
      )

      // Clica em Remover
      fireEvent.click(screen.getByRole('button', { name: /^remover$/i }))

      // Confirmação visível
      expect(screen.getByText(/deseja remover este cenário\?/i)).toBeTruthy()

      // Clica em Confirmar
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

      await waitFor(() => {
        expect(onDeleteScenario).toHaveBeenCalledWith('sc-crud')
      })

      // Erro exibido
      expect(await screen.findByText('Falha ao deletar cenário')).toBeTruthy()

      // Cenário ainda presente
      expect(screen.getByText('Cenário CRUD')).toBeTruthy()
    })

    it('ao falhar a adição de nova dose, preserva o draft', async () => {
      const onUpdateDoses = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Falha ao adicionar dose',
      })

      render(
        <DoseEditor
          scenario={mockScenario}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateDoses={onUpdateDoses}
        />,
      )

      // Preenche nova dose
      const amountInput = screen.getByLabelText(/quantidade da dose/i) as HTMLInputElement
      fireEvent.change(amountInput, { target: { value: '50' } })
      fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-09-02' } })
      fireEvent.change(screen.getByLabelText(/^hora$/i), { target: { value: '10:00' } })

      // Submete
      fireEvent.click(screen.getByRole('button', { name: /\+ adicionar dose/i }))

      await waitFor(() => {
        expect(onUpdateDoses).toHaveBeenCalled()
      })

      // Erro exibido
      expect(await screen.findByText('Falha ao adicionar dose')).toBeTruthy()

      // Draft continua com o valor digitado
      expect(amountInput.value).toBe('50')
    })

    it('ao falhar a remoção de dose, exibe erro', async () => {
      const onUpdateDoses = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Falha ao remover dose',
      })

      render(
        <DoseEditor
          scenario={mockScenario}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateDoses={onUpdateDoses}
        />,
      )

      // Clica em Remover dose
      fireEvent.click(screen.getByRole('button', { name: /^remover dose$/i }))

      await waitFor(() => {
        expect(onUpdateDoses).toHaveBeenCalledWith([])
      })

      // Erro exibido
      expect(await screen.findByText('Falha ao remover dose')).toBeTruthy()

      // A dose original continua visível na tabela
      expect(screen.getByText('10 mg')).toBeTruthy()
    })
  })

  describe('Blocker 2 — History Builder e Paleta Fechada', () => {
    it('createComparatorCalculationRecord sanitiza cores garantindo pertinência a PALETTE_ALLOWED', async () => {
      const { createComparatorCalculationRecord } = await import('../../../features/comparator/lib/historyRecord')
      const { PALETTE_ALLOWED } = await import('../../../domain/shared/colors')

      const badColorScenario: Scenario = {
        id: 'sc-bad-color',
        name: 'Bad Color Scenario',
        color: '#123456' as unknown as Scenario['color'], // cor fora da paleta
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [{ id: 'd-1', amountMg: 10, time: '2026-09-01T12:00:00.000Z' }],
      }

      const mockAnalyzed = {
        scenario: badColorScenario,
        calculationWindow: { startMs: 0, endMs: 10000 },
        simulationInput: {
          halfLifeMs: 86400000,
          tmaxMs: null,
          doses: [{ id: 'd-1', amountMg: 10, timeMs: 1000 }],
          nowMs: 1000,
        },
        result: {
          currentState: {
            administeredMg: 10,
            centralMg: 10,
            depotMg: 0,
            eliminatedMg: 0,
            administeredCount: 1,
            plannedCount: 0,
            centralPercent: 100,
            depotPercent: 0,
            eliminatedPercent: 0,
          },
          analysisCurve: [{ timeMs: 1000, amountMg: 10 }],
          peak: { timeMs: 1000, amountMg: 10 },
          milestones: [],
          administrations: [{ doseId: 'd-1', amountMg: 10, timeMs: 1000 }],
          warnings: [],
          metadata: {
            pkEngineVersion: '1.0.0',
            kePerMs: 0.001,
            kaPerMs: null,
            terminalHalfLifeMs: 86400000,
            horizonEndMs: 10000,
            analysisCurveSteps: 100,
            contributionCutoffHalfLives: 44 as const,
            contributionCutoffAgeMs: 86400000 * 44,
          },
        },
        displayPoints: [{ timeMs: 1000, amountMg: 10 }],
        snapshotPoints: [{ timeMs: 1000, value: 10, valueKind: 'mg' as const }],
        phaseHint: 'absorbing_latest' as const,
      }

      const record = createComparatorCalculationRecord({
        analyzedScenarios: [mockAnalyzed],
        displayWindow: { startMs: 0, endMs: 10000 },
        calendarTimeZone: 'America/Sao_Paulo',
        scaleMode: 'absolute',
        yAxisMode: 'linear',
      })

      // Cores geradas no record DEVEM pertencer estritamente à PALETTE_ALLOWED
      expect(record.type).toBe('pharmacokinetics')
      if (record.type === 'pharmacokinetics') {
        expect((PALETTE_ALLOWED as readonly string[]).includes(record.display.color)).toBe(true)
        expect((PALETTE_ALLOWED as readonly string[]).includes(record.scenarios[0].scenarioSnapshot.color)).toBe(true)
        expect((PALETTE_ALLOWED as readonly string[]).includes(record.chartViewSnapshot.displayPointsByScenario[0].color)).toBe(true)
      }
    })
  })

  describe('Blocker 5 — Multicenário Válido + Solver Failure na UI', () => {
    it('cenário A é analisado normalmente enquanto cenário B com solver failure é exibido no alerta sem derrubar A', async () => {
      const { AnalysisPage } = await import('../../../features/comparator/pages/AnalysisPage')
      const { formatDomainError } = await import('../../../app/i18n/pt-BR.messages')

      const scenarioValid: Scenario = {
        id: 'sc-valid',
        name: 'Cenário Válido',
        color: '#2563eb',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [{ id: 'd-1', amountMg: 10, time: '2026-09-01T12:00:00.000Z' }],
      }

      const scenarioFail: Scenario = {
        id: 'sc-fail',
        name: 'Cenário Solver Fail',
        color: '#059669',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 1, tmaxMs: 86400000 },
        doses: [{ id: 'd-2', amountMg: 10, time: '2026-09-01T12:00:00.000Z' }],
      }

      const displayWindow = {
        startMs: 1788264000000 - 86400000,
        endMs: 1788264000000 + 86400000,
      }

      const resValid = analyzeScenario(scenarioValid, displayWindow, 1788264000000, 'absolute', 'linear')
      const resFail = analyzeScenario(scenarioFail, displayWindow, 1788264000000, 'absolute', 'linear')

      expect(resValid.status).toBe('success')
      expect(resFail.status).toBe('error')

      const analyzedScenarios = resValid.status === 'success' ? [resValid.data] : []
      const scenarioErrors = resFail.status === 'error' ? [{ scenario: resFail.scenario, error: resFail.error }] : []

      render(
        <AnalysisPage
          analyzedScenarios={analyzedScenarios}
          nonContributingScenarios={[]}
          scenarioErrors={scenarioErrors}
          displayWindow={displayWindow}
          calendarTimeZone="America/Sao_Paulo"
          scaleMode="absolute"
          yAxisMode="linear"
          onUpdateDisplayWindow={vi.fn()}
          onToggleScaleMode={vi.fn()}
          onToggleYAxisMode={vi.fn()}
        />,
      )

      // Cenário A aparece nos componentes de métricas
      expect(screen.getAllByText('Cenário Válido').length).toBeGreaterThanOrEqual(1)

      // Cenário B aparece no alerta de erro
      const alertBox = screen.getByRole('alert')
      expect(alertBox.textContent).toContain('Cenário Solver Fail')
      expect(alertBox.textContent).toContain(formatDomainError(resFail.status === 'error' ? resFail.error : { code: 'NUMERIC_FAILURE' }))
    })
  })

  describe('Blocker 7 — Centralização de i18n da E9', () => {
    it('contém todas as chaves de mensagens centralizadas para o Comparador', async () => {
      const { messages } = await import('../../../app/i18n/pt-BR.messages')
      expect(messages.comparator.massUnitMcg).toBe('mcg')
      expect(messages.comparator.massUnitMg).toBe('mg')
      expect(messages.comparator.massUnitG).toBe('g')
      expect(messages.comparator.colorOptionLabel(1, '#2563eb')).toBe('Cor 1 (#2563eb)')
      expect(messages.comparator.doseAmountPlaceholder).toBe('Ex.: 10')
      expect(messages.comparator.doseAmountInvalid).toBeTruthy()
      expect(messages.comparator.doseDateTimeInvalid).toBeTruthy()
      expect(messages.comparator.configNotLoaded).toBe('Configuração não carregada.')
      expect(messages.comparator.saveError).toBe('Erro ao salvar.')
      expect(messages.comparator.loadingComparator).toBe('Carregando comparador…')
    })
  })
})
