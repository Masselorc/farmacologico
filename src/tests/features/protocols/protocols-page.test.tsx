import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import type { ConfigPayload, Protocol } from '../../../domain/types'

// Mock Chart.js para evitar renderização pesada de canvas em jsdom
vi.mock('chart.js', () => ({
  Chart: class MockChart {
    static register = vi.fn()
    destroy = vi.fn()
  },
  CategoryScale: {},
  LineController: {},
  LineElement: {},
  LinearScale: {},
  PointElement: {},
  Tooltip: {},
}))

// Mock de storage para controlar loadConfigPayload e mutateConfigPayload
const mockProtocol: Protocol = {
  id: 'proto-test-1',
  name: 'Protocolo Teste Alpha',
  totalDoseMg: 200,
  schedule: {
    startDate: '2026-09-01',
    localTime: '08:00',
    timeZone: 'America/Sao_Paulo',
    recurrence: {
      type: 'weekly',
      weekdays: [2], // Terça-feira
      weeks: 8,
    },
  },
  components: [
    {
      id: 'comp-1',
      label: 'Enantato',
      proportion: 1,
      source: { type: 'manual' },
      selectedPkParameters: { halfLifeMs: 6 * 86400000, tmaxMs: 2 * 86400000 },
      pkParametersSnapshot: {
        halfLife: { value: 6, unit: 'days' },
        tmax: { value: 2, unit: 'days' },
      },
      displayColor: { paletteColor: '#2563eb' },
    },
  ],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

let mockConfigPayload: ConfigPayload = {
  settings: {
    theme: 'system',
    calendarTimeZone: 'America/Sao_Paulo',
  },
  favorites: { substances: [], recipeIds: [] },
  customSubstances: [],
  customProfiles: [],
  recipes: [],
  scenarios: [],
  protocols: [mockProtocol],
}

vi.mock('../../../storage', () => ({
  loadConfigPayload: vi.fn(async () => mockConfigPayload),
  mutateConfigPayload: vi.fn(async (mutator: (curr: ConfigPayload) => ConfigPayload) => {
    mockConfigPayload = mutator(mockConfigPayload)
    return { ok: true, value: mockConfigPayload }
  }),
}))

import { ProtocolsPage } from '../../../features/protocols/pages/ProtocolsPage'
import { mutateConfigPayload } from '../../../storage'

describe('ProtocolsPage Component (E11)', () => {
  beforeEach(() => {
    mockConfigPayload = {
      settings: {
        theme: 'system',
        calendarTimeZone: 'America/Sao_Paulo',
      },
      favorites: { substances: [], recipeIds: [] },
      customSubstances: [],
      customProfiles: [],
      recipes: [],
      scenarios: [],
      protocols: [{ ...mockProtocol }],
    }
    vi.clearAllMocks()
  })

  it('substitui o placeholder por tela funcional com abas e dados do protocolo carregado', async () => {
    await act(async () => {
      render(<ProtocolsPage />)
    })

    // Não contém placeholder legado
    expect(screen.queryByText(/implementação prevista na E11/i)).toBeNull()

    // Abas presentes
    expect(screen.getByRole('tab', { name: /Calendário/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Gráficos/i })).toBeTruthy()

    // Card do protocolo presente na visualização
    expect(screen.getAllByText(/Protocolo Teste Alpha/i).length).toBeGreaterThan(0)
  })

  it('permite alternar entre abas Calendário e Gráficos', async () => {
    await act(async () => {
      render(<ProtocolsPage />)
    })

    const chartsTab = screen.getByRole('tab', { name: /Gráficos/i })
    await act(async () => {
      fireEvent.click(chartsTab)
    })

    expect(chartsTab.getAttribute('aria-selected')).toBe('true')
    // Controles de gráfico visíveis
    expect(screen.getByText(/Modo de exibição do gráfico/i)).toBeTruthy()
  })

  it('abre ProtocolDialog ao clicar em Novo protocolo e cancela', async () => {
    await act(async () => {
      render(<ProtocolsPage />)
    })

    const newBtn = screen.getByRole('button', { name: /Novo protocolo/i })
    await act(async () => {
      fireEvent.click(newBtn)
    })

    expect(screen.getByRole('heading', { name: /Novo protocolo/i })).toBeTruthy()

    // Cancelar
    const cancelBtn = screen.getAllByRole('button', { name: /Cancelar/i })[0]!
    await act(async () => {
      fireEvent.click(cancelBtn)
    })

    expect(screen.queryByRole('heading', { name: /Novo protocolo/i })).toBeNull()
  })

  it('cria e persiste novo protocolo através de mutateConfigPayload', async () => {
    await act(async () => {
      render(<ProtocolsPage />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Novo protocolo/i }))
    })

    // Preenche campos
    const nameInput = screen.getByLabelText(/Nome do protocolo/i)
    const doseInput = screen.getByLabelText(/Dose total informada/i)

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Novo Ciclo' } })
      fireEvent.change(doseInput, { target: { value: '250' } })
    })

    // Submete formulário
    const submitBtn = screen.getByRole('button', { name: /Criar protocolo/i })
    await act(async () => {
      fireEvent.click(submitBtn)
    })

    expect(mutateConfigPayload).toHaveBeenCalled()
    expect(mockConfigPayload.protocols).toHaveLength(2)
    expect(mockConfigPayload.protocols.some((p) => p.name === 'Novo Ciclo')).toBe(true)
  })

  it('exclui protocolo abrindo modal próprio de confirmação (sem window.confirm)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')

    await act(async () => {
      render(<ProtocolsPage />)
    })

    // Abre o menu rápido de ações do card
    const quickMenuTrigger = screen.getAllByRole('button', { name: /Ações para administração/i })[0]!
    await act(async () => {
      fireEvent.click(quickMenuTrigger)
    })

    // Clica em Excluir
    const deleteBtn = screen.getByRole('menuitem', { name: /Excluir protocolo/i })
    await act(async () => {
      fireEvent.click(deleteBtn)
    })

    // Zero window.confirm chamado
    expect(confirmSpy).not.toHaveBeenCalled()

    // Modal de exclusão aberto
    expect(screen.getByRole('dialog', { name: /Excluir protocolo/i })).toBeTruthy()

    // Confirma exclusão
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Excluir' })
    await act(async () => {
      fireEvent.click(confirmDeleteBtn)
    })

    expect(mutateConfigPayload).toHaveBeenCalled()
    expect(mockConfigPayload.protocols).toHaveLength(0)

    confirmSpy.mockRestore()
  })

  it('permite reagendar via teclado e reverter a ação pelo botão Desfazer', async () => {
    await act(async () => {
      render(<ProtocolsPage />)
    })

    // Abre menu rápido
    const quickMenuTrigger = screen.getAllByRole('button', { name: /Ações para administração/i })[0]!
    await act(async () => {
      fireEvent.click(quickMenuTrigger)
    })

    // Clica em Mover
    const moveBtn = screen.getByRole('menuitem', { name: /Mover protocolo/i })
    await act(async () => {
      fireEvent.click(moveBtn)
    })

    // Modal de teclado aberto
    expect(screen.getByRole('dialog', { name: /Mover protocolo/i })).toBeTruthy()

    // Clica em +1 dia
    const plusOneBtn = screen.getByRole('button', { name: '+1 dia' })
    await act(async () => {
      fireEvent.click(plusOneBtn)
    })

    // Salva reagendamento
    const saveMoveBtn = screen.getByRole('button', { name: /Salvar alterações/i })
    await act(async () => {
      fireEvent.click(saveMoveBtn)
    })

    // Verifica que reagendou
    expect(mutateConfigPayload).toHaveBeenCalled()
    expect(mockConfigPayload.protocols[0]!.schedule.startDate).toBe('2026-09-02')

    // UndoBar deve estar visível
    const undoBtn = screen.getByRole('button', { name: /Desfazer/i })
    expect(undoBtn).toBeTruthy()

    // Clica em Desfazer
    await act(async () => {
      fireEvent.click(undoBtn)
    })

    // Protocolo revertido para data original
    expect(mockConfigPayload.protocols[0]!.schedule.startDate).toBe('2026-09-01')
  })
})
