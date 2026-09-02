import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DoseEditor } from '../../../features/comparator/components/DoseEditor'
import { ScenarioList } from '../../../features/comparator/components/ScenarioList'
import { EditPage } from '../../../features/comparator/pages/EditPage'
import type { Scenario } from '../../../domain/types'
import { messages } from '../../../app/i18n/pt-BR.messages'

describe('E9.3 Blocker 2 — Falhas assíncronas do storage / Promise Rejection', () => {
  const dummyScenario: Scenario = {
    id: 'sc-test-1',
    name: 'Cenário Teste Falhas',
    color: '#2563eb',
    source: { type: 'manual', pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null } },
    displayUnit: 'mg',
    selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
    doses: [
      { id: 'dose-1', amountMg: 50, time: '2026-09-01T12:00:00.000Z' },
    ],
  }

  describe('DoseEditor — Preservação de Draft sob Falha Assíncrona', () => {
    it('quando onUpdateDoses rejeita Promise, exibe erro e PRESERVA valores do draft nos inputs', async () => {
      const onUpdateDoses = vi.fn().mockRejectedValueOnce(new Error('IndexedDB transaction failed'))

      render(
        <DoseEditor
          scenario={dummyScenario}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateDoses={onUpdateDoses}
        />,
      )

      // Preenche nova dose
      const amountInput = screen.getByLabelText(/quantidade/i) as HTMLInputElement
      const dateInput = screen.getByLabelText(/data/i) as HTMLInputElement
      const timeInput = screen.getByLabelText(/hora/i) as HTMLInputElement

      fireEvent.change(amountInput, { target: { value: '125' } })
      fireEvent.change(dateInput, { target: { value: '2026-09-05' } })
      fireEvent.change(timeInput, { target: { value: '14:30' } })

      const addBtn = screen.getByRole('button', { name: /\+ Adicionar dose/i })

      await act(async () => {
        fireEvent.click(addBtn)
      })

      // onUpdateDoses foi chamado
      expect(onUpdateDoses).toHaveBeenCalledTimes(1)

      // Aguarda erro na UI
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy()
      })

      // INVARIANTE CRÍTICA: Os campos do formulário NÃO foram resetados!
      expect(amountInput.value).toBe('125')
      expect(dateInput.value).toBe('2026-09-05')
      expect(timeInput.value).toBe('14:30')
    })

    it('quando onUpdateDoses resolve { ok: false }, exibe erro e preserva valores do draft', async () => {
      const onUpdateDoses = vi.fn().mockResolvedValueOnce({ ok: false, error: 'Falha simulada de persistência' })

      render(
        <DoseEditor
          scenario={dummyScenario}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateDoses={onUpdateDoses}
        />,
      )

      const amountInput = screen.getByLabelText(/quantidade/i) as HTMLInputElement
      const dateInput = screen.getByLabelText(/data/i) as HTMLInputElement
      const timeInput = screen.getByLabelText(/hora/i) as HTMLInputElement

      fireEvent.change(amountInput, { target: { value: '77' } })
      fireEvent.change(dateInput, { target: { value: '2026-09-05' } })
      fireEvent.change(timeInput, { target: { value: '14:30' } })

      const addBtn = screen.getByRole('button', { name: /\+ Adicionar dose/i })
      await act(async () => {
        fireEvent.click(addBtn)
      })

      expect(onUpdateDoses).toHaveBeenCalledTimes(1)

      await waitFor(() => {
        expect(screen.getByText('Falha simulada de persistência')).toBeTruthy()
      })

      expect(amountInput.value).toBe('77')
    })
  })

  describe('ScenarioList — Retenção de Cenário sob Falha Assíncrona', () => {
    it('quando onDeleteScenario rejeita Promise, exibe erro e MANTÉM cenário na UI', async () => {
      const onDeleteScenario = vi.fn().mockRejectedValueOnce(new Error('Falha ao excluir no IndexedDB'))

      render(
        <ScenarioList
          scenarios={[dummyScenario]}
          activeScenarioId={dummyScenario.id}
          onSelectScenario={vi.fn()}
          onEditScenario={vi.fn()}
          onDeleteScenario={onDeleteScenario}
          onAddNewScenario={vi.fn()}
          canAddScenario={true}
        />,
      )

      // Inicia exclusão
      const removeBtn = screen.getByRole('button', { name: /^remover$/i })
      fireEvent.click(removeBtn)

      const confirmBtn = screen.getByRole('button', { name: /confirmar/i })
      await act(async () => {
        fireEvent.click(confirmBtn)
      })

      expect(onDeleteScenario).toHaveBeenCalledWith(dummyScenario.id)

      // Erro exibido
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy()
      })

      // Cenário CONTINUA visível na lista
      expect(screen.getByText(dummyScenario.name)).toBeTruthy()
    })
  })

  describe('EditPage — Tratamento de Rejection e Failure em onUpdateScenarios', () => {
    it('trata Promise rejection de onUpdateScenarios exibindo mensagem e mantendo estado', async () => {
      const onUpdateScenarios = vi.fn().mockRejectedValueOnce(new Error('Storage crash'))

      render(
        <EditPage
          scenarios={[dummyScenario]}
          calendarTimeZone="America/Sao_Paulo"
          onUpdateScenarios={onUpdateScenarios}
        />,
      )

      // Tenta remover o cenário
      const removeBtn = screen.getByRole('button', { name: /^remover$/i })
      fireEvent.click(removeBtn)

      const confirmBtn = screen.getByRole('button', { name: /confirmar/i })
      await act(async () => {
        fireEvent.click(confirmBtn)
      })

      // Erro exibido
      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1)
      })
      expect(screen.getAllByText(messages.comparator.deleteScenarioError).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(dummyScenario.name)).toBeTruthy()
    })
  })
})
