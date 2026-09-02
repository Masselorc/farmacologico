import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MetricsPanel } from '../../../features/comparator/components/MetricsPanel'
import { DoseEditor } from '../../../features/comparator/components/DoseEditor'
import { sanitizeColor, DEFAULT_SCENARIO_COLORS } from '../../../features/comparator/lib/colors'
import { createEmptyScenarioDraft } from '../../../features/comparator/lib/form'
import { analyzeScenario } from '../../../features/comparator/lib/analysis'
import type { ComparatorAnalyzedScenario } from '../../../features/comparator/lib/analysis'
import type { Scenario, Dose } from '../../../domain/types'

describe('E9.1 Regressions RED Phase', () => {
  afterEach(() => {
    cleanup()
  })
  describe('Blocker 1 — MetricsPanel administeredCount vs plannedCount', () => {
    it('exibe administeredCount = 1 e plannedCount = 2 em vez de administrations.length = 3', () => {
      const mockAnalyzedScenario: ComparatorAnalyzedScenario = {
        scenario: {
          id: 'sc-1',
          name: 'Cenário Teste',
          color: '#2563eb',
          source: { type: 'manual' },
          displayUnit: 'mg',
          selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
          doses: [],
        },
        calculationWindow: { startMs: 0, endMs: 10000 },
        simulationInput: {
          halfLifeMs: 86400000,
          tmaxMs: null,
          doses: [
            { id: 'd-1', amountMg: 10, timeMs: 1000 },
            { id: 'd-2', amountMg: 10, timeMs: 3000 },
            { id: 'd-3', amountMg: 10, timeMs: 4000 },
          ],
          nowMs: 2000,
        },
        result: {
          currentState: {
            administeredMg: 10,
            centralMg: 10,
            depotMg: 0,
            eliminatedMg: 0,
            administeredCount: 1, // 1 dose passada
            plannedCount: 2,      // 2 doses futuras
            centralPercent: 100,
            depotPercent: 0,
            eliminatedPercent: 0,
          },
          analysisCurve: [{ timeMs: 1000, amountMg: 10 }],
          peak: { timeMs: 1000, amountMg: 10 },
          milestones: [],
          administrations: [
            { doseId: 'd-1', amountMg: 10, timeMs: 1000 },
            { doseId: 'd-2', amountMg: 10, timeMs: 3000 },
            { doseId: 'd-3', amountMg: 10, timeMs: 4000 },
          ], // length = 3
          warnings: [],
          metadata: {
            pkEngineVersion: '1.0.0',
            kePerMs: 0.001,
            kaPerMs: null,
            terminalHalfLifeMs: 86400000,
            horizonEndMs: 10000,
            analysisCurveSteps: 100,
            contributionCutoffHalfLives: 44,
            contributionCutoffAgeMs: 3801600000,
          },
        },
        displayPoints: [{ timeMs: 1000, amountMg: 10 }],
        snapshotPoints: [{ timeMs: 1000, value: 10, valueKind: 'mg', clippedBelowLogEpsilon: false }],
        phaseHint: 'awaiting_next_planned',
      }

      render(
        <MetricsPanel
          analyzedScenarios={[mockAnalyzedScenario]}
          calendarTimeZone="America/Sao_Paulo"
        />,
      )

      // Administrações realizadas deve mostrar 1 (não 3)
      const administeredItem = screen.getByText('Administrações realizadas').closest('.metric-item')
      expect(administeredItem?.querySelector('.metric-value')?.textContent).toBe('1')

      // Doses futuras na simulação deve existir e mostrar 2
      const plannedItem = screen.getByText('Doses futuras na simulação').closest('.metric-item')
      expect(plannedItem).toBeTruthy()
      expect(plannedItem?.querySelector('.metric-value')?.textContent).toBe('2')
    })
  })

  describe('Blocker 2 — Preservação de DomainError em analyzeScenario', () => {
    it('preserva DomainError estruturado quando o motor PK falha com ABSORPTION_SOLVER_FAILURE', () => {
      // Cenário com parâmetros que provocam falha de solver ou erro de domínio
      const scenario: Scenario = {
        id: 'sc-fail',
        name: 'Cenário Falha',
        color: '#2563eb',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: {
          halfLifeMs: 86400000,
          tmaxMs: -1000, // Tmax negativo deve disparar DomainError
        },
        doses: [{ id: 'd-1', amountMg: 10, time: '2026-09-01T12:00:00Z' }],
      }

      const result = analyzeScenario(
        scenario,
        { startMs: 0, endMs: 2000000000000 },
        1700000000000,
        'absolute',
        'linear',
      )

      expect(result.status).toBe('error')
      if (result.status === 'error') {
        // O erro DEVE ser um DomainError com código estruturado, NÃO string
        expect(typeof result.error).toBe('object')
        expect(result.error.code).toBeTruthy()
      }
    })
  })

  describe('Blocker 3 — Paleta fechada e índice determinístico', () => {
    it('rejeita hex arbitrário que não pertence à paleta autorizada e usa fallback seguro', () => {
      const arbitraryHex = '#123456'
      const sanitized = sanitizeColor(arbitraryHex)
      expect(sanitized).toBe(DEFAULT_SCENARIO_COLORS[0])
    })

    it('preserva cores da paleta autorizada', () => {
      for (const color of DEFAULT_SCENARIO_COLORS) {
        expect(sanitizeColor(color)).toBe(color)
      }
    })

    it('createEmptyScenarioDraft usa getScenarioColorByIndex para ciclar cores', () => {
      const draft0 = createEmptyScenarioDraft(0)
      const draft1 = createEmptyScenarioDraft(1)
      const draft2 = createEmptyScenarioDraft(2)

      expect(draft0.color).toBe(DEFAULT_SCENARIO_COLORS[0])
      expect(draft1.color).toBe(DEFAULT_SCENARIO_COLORS[1])
      expect(draft2.color).toBe(DEFAULT_SCENARIO_COLORS[2])
    })
  })

  describe('Blocker 4 — Edição real de doses no DoseEditor', () => {
    it('permite editar uma dose existente mantendo o mesmo ID', () => {
      const initialDose: Dose = {
        id: 'dose-fixed-id-123',
        amountMg: 10,
        time: '2026-09-01T12:00:00Z',
      }
      const scenario: Scenario = {
        id: 'sc-1',
        name: 'Cenário 1',
        color: '#2563eb',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [initialDose],
      }

      const onUpdateDoses = vi.fn()

      render(
        <DoseEditor
          scenario={scenario}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateDoses={onUpdateDoses}
        />,
      )

      // Deve ter botão Editar
      const editBtn = screen.getByRole('button', { name: /editar/i })
      expect(editBtn).toBeTruthy()
      fireEvent.click(editBtn)

      // Form deve estar preenchido com a dose
      const amountInput = screen.getByLabelText(/quantidade/i) as HTMLInputElement
      expect(amountInput.value).toBe('10')

      // Altera a quantidade
      fireEvent.change(amountInput, { target: { value: '25' } })

      // Salva a alteração
      const saveBtn = screen.getByRole('button', { name: /salvar/i })
      fireEvent.click(saveBtn)

      expect(onUpdateDoses).toHaveBeenCalledTimes(1)
      const updatedDoses: Dose[] = onUpdateDoses.mock.calls[0][0]
      expect(updatedDoses).toHaveLength(1)
      expect(updatedDoses[0].id).toBe('dose-fixed-id-123') // ID PRESERVADO!
      expect(updatedDoses[0].amountMg).toBe(25)
    })
  })

  describe('Confirmação de Exclusão de Cenário', () => {
    it('solicita confirmação antes de remover o cenário e permite cancelar', async () => {
      const scenario: Scenario = {
        id: 'sc-del',
        name: 'Cenário Para Deletar',
        color: '#2563eb',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [],
      }

      const onDeleteScenario = vi.fn()
      const { ScenarioList } = await import('../../../features/comparator/components/ScenarioList')

      render(
        <ScenarioList
          scenarios={[scenario]}
          activeScenarioId="sc-del"
          onSelectScenario={vi.fn()}
          onEditScenario={vi.fn()}
          onDeleteScenario={onDeleteScenario}
          onAddNewScenario={vi.fn()}
          canAddScenario={true}
        />,
      )

      // Clica em Remover
      const removeBtn = screen.getByRole('button', { name: /^remover$/i })
      fireEvent.click(removeBtn)

      // Deve exibir mensagem de confirmação
      expect(screen.getByText(/Deseja remover este cenário\?/i)).toBeTruthy()

      // Clica em Cancelar
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelBtn)

      expect(onDeleteScenario).not.toHaveBeenCalled()
      expect(screen.queryByText(/Deseja remover este cenário\?/i)).toBeNull()

      // Clica em Remover novamente e confirma
      fireEvent.click(screen.getByRole('button', { name: /^remover$/i }))
      const confirmBtn = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmBtn)

      expect(onDeleteScenario).toHaveBeenCalledWith('sc-del')
    })
  })

  describe('Propagação de Erro de Persistência', () => {
    it('exibe alerta e não fecha formulário quando onUpdateScenarios falha', async () => {
      const { EditPage } = await import('../../../features/comparator/pages/EditPage')
      const onUpdateScenarios = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Falha simulada de persistência',
      })

      render(
        <EditPage
          scenarios={[]}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateScenarios={onUpdateScenarios}
        />,
      )

      // Clica em adicionar cenário
      const addBtn = screen.getByRole('button', { name: /\+ Adicionar cenário/i })
      fireEvent.click(addBtn)

      // Preenche formulário
      fireEvent.change(screen.getByLabelText(/nome do cenário/i), { target: { value: 'Novo Cenário' } })
      fireEvent.change(screen.getByLabelText(/^meia-vida$/i), { target: { value: '5' } })

      // Salva
      const saveBtn = screen.getByRole('button', { name: /salvar cenário/i })
      fireEvent.click(saveBtn)

      await screen.findByRole('alert')
      expect(screen.getByText('Falha simulada de persistência')).toBeTruthy()
      // O formulário de cenário DEVE continuar aberto (não resetou para a lista)
      expect(screen.getByLabelText(/nome do cenário/i)).toBeTruthy()
    })
  })

  describe('Exibição de Erros Estruturados por Cenário em AnalysisPage', () => {
    it('renderiza caixa de erro com role="alert" e textos traduzidos', async () => {
      const { AnalysisPage } = await import('../../../features/comparator/pages/AnalysisPage')
      const scenario: Scenario = {
        id: 'sc-err',
        name: 'Cenário com Falha',
        color: '#2563eb',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [],
      }

      render(
        <AnalysisPage
          analyzedScenarios={[]}
          nonContributingScenarios={[]}
          scenarioErrors={[
            {
              scenario,
              error: { code: 'ABSORPTION_SOLVER_FAILURE' },
            },
          ]}
          displayWindow={{ startMs: 0, endMs: 10000 }}
          calendarTimeZone="America/Sao_Paulo"
          scaleMode="absolute"
          yAxisMode="linear"
          onUpdateDisplayWindow={vi.fn()}
          onToggleScaleMode={vi.fn()}
          onToggleYAxisMode={vi.fn()}
        />,
      )

      const alertBox = screen.getByRole('alert')
      expect(alertBox).toBeTruthy()
      expect(alertBox.textContent).toContain('Cenário com Falha')
      expect(alertBox.textContent).toContain('O Tmax informado gera uma constante de absorção')
    })
  })

  describe('Garantia de Zero Estilos Inline nos Componentes', () => {
    it('MetricsPanel, ScenarioList, ModelDetails e MilestonesTable usam classes estáticas tone-* sem style inline', async () => {
      const { ScenarioList } = await import('../../../features/comparator/components/ScenarioList')
      const { ModelDetails } = await import('../../../features/comparator/components/ModelDetails')
      const { MilestonesTable } = await import('../../../features/comparator/components/MilestonesTable')

      const scenario: Scenario = {
        id: 'sc-tone',
        name: 'Cenário Tone',
        color: '#059669',
        source: { type: 'manual' },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [],
      }

      const mockItem: ComparatorAnalyzedScenario = {
        scenario,
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
          milestones: [{ percentage: 50, targetMg: 5, timeMs: 2000 }],
          administrations: [],
          warnings: [],
          metadata: {
            pkEngineVersion: '1.0.0',
            kePerMs: 0.001,
            kaPerMs: null,
            terminalHalfLifeMs: 86400000,
            horizonEndMs: 10000,
            analysisCurveSteps: 100,
            contributionCutoffHalfLives: 44,
            contributionCutoffAgeMs: 3801600000,
          },
        },
        displayPoints: [{ timeMs: 1000, amountMg: 10 }],
        snapshotPoints: [{ timeMs: 1000, value: 10, valueKind: 'mg', clippedBelowLogEpsilon: false }],
        phaseHint: 'terminal_decline',
      }

      const r1 = render(
        <ScenarioList
          scenarios={[scenario]}
          activeScenarioId={null}
          onSelectScenario={vi.fn()}
          onEditScenario={vi.fn()}
          onDeleteScenario={vi.fn()}
          onAddNewScenario={vi.fn()}
          canAddScenario={true}
        />,
      )
      expect(r1.container.querySelector('.tone-bg-059669')).toBeTruthy()
      expect(r1.container.querySelectorAll('[style]').length).toBe(0)

      const r2 = render(
        <MetricsPanel analyzedScenarios={[mockItem]} calendarTimeZone="America/Sao_Paulo" />,
      )
      expect(r2.container.querySelector('.tone-border-top-059669')).toBeTruthy()
      expect(r2.container.querySelectorAll('[style]').length).toBe(0)

      const r3 = render(<ModelDetails analyzedScenarios={[mockItem]} />)
      expect(r3.container.querySelector('.tone-color-059669')).toBeTruthy()
      expect(r3.container.querySelectorAll('[style]').length).toBe(0)

      const r4 = render(
        <MilestonesTable analyzedScenarios={[mockItem]} calendarTimeZone="America/Sao_Paulo" />,
      )
      expect(r4.container.querySelector('.tone-color-059669')).toBeTruthy()
      expect(r4.container.querySelectorAll('[style]').length).toBe(0)
    })
  })
})
