import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalculationRecord, ConfigPayload, Scenario } from '../../../domain/types'
import { ComparatorPage } from '../../../features/comparator/pages/ComparatorPage'
import * as storageModule from '../../../storage'

vi.mock('../../../features/charts/CompareChart', () => ({
  CompareChart: () => <div data-testid="mock-compare-chart" />,
}))

vi.mock('../../../storage', async (importOriginal) => {
  const actual = await importOriginal<typeof storageModule>()
  return {
    ...actual,
    loadConfigPayload: vi.fn(),
    mutateConfigPayload: vi.fn(),
    addCalculationRecord: vi.fn(),
    getPersistenceConsent: vi.fn(),
    getStorageMode: vi.fn(),
  }
})

describe('ComparatorPage Component (§15, E9)', () => {
  const initialScenario: Scenario = {
    id: 'sc-1',
    name: 'Cenário Inicial',
    color: '#2563eb',
    source: { type: 'manual' },
    displayUnit: 'mg',
    selectedPkParameters: {
      halfLifeMs: 86400000, // 1 dia
      tmaxMs: null,
    },
    doses: [
      { id: 'd-1', amountMg: 10, time: '2026-09-01T12:00:00Z' },
    ],
  }

  const mockConfig: ConfigPayload = {
    settings: {
      calendarTimeZone: 'America/Sao_Paulo',
      theme: 'dark',
    },
    scenarios: [initialScenario],
    customSubstances: [],
    customProfiles: [],
    recipes: [],
    protocols: [],
    favorites: {
      substances: [],
      recipeIds: [],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storageModule.loadConfigPayload).mockResolvedValue(mockConfig)
    vi.mocked(storageModule.getPersistenceConsent).mockReturnValue(true)
    vi.mocked(storageModule.getStorageMode).mockReturnValue('persistent-ok')
    vi.mocked(storageModule.addCalculationRecord).mockResolvedValue({
      ok: true,
      record: {} as unknown as CalculationRecord,
      evictedCount: 0,
      evictedBytes: 0,
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('carrega configuração e renderiza os painéis do Comparador', async () => {
    render(<ComparatorPage />)

    expect(screen.getByText(/Carregando comparador/i)).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Meia-vida/i })).toBeTruthy()
      expect(screen.getByText(/Fuso do calendário: America\/Sao_Paulo/i)).toBeTruthy()
      expect(screen.getAllByText(/Cenário Inicial/i).length).toBeGreaterThan(0)
    })
  })

  it('atualiza o relógio a cada 1 segundo sem persistir automaticamente no histórico', async () => {
    vi.useFakeTimers()
    render(<ComparatorPage />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(screen.getByRole('heading', { level: 1, name: /Meia-vida/i })).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    // addCalculationRecord NÃO deve ter sido chamado pelo tick do relógio
    expect(storageModule.addCalculationRecord).not.toHaveBeenCalled()
  })

  it('salva análise no histórico mediante clique explícito no botão', async () => {
    render(<ComparatorPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Meia-vida/i })).toBeTruthy()
    })

    const saveBtn = screen.getByRole('button', { name: /Salvar análise no histórico/i })
    expect(saveBtn).toBeTruthy()

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(storageModule.addCalculationRecord).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Análise salva no histórico/i)).toBeTruthy()
    })
  })
})
