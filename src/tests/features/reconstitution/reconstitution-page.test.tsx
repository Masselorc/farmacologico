import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReconstitutePage } from '../../../features/reconstitution/pages/ReconstitutePage'
import { calculateReconstitution } from '../../../domain/reconstitution/calculate'
import { createReconstitutionCalculationRecord } from '../../../features/reconstitution/lib/historyRecord'
import type { ReconstitutionInput } from '../../../domain/types'
import { indexedDB } from 'fake-indexeddb'
import {
  setCustomIDBFactoryForTesting,
  setPersistenceConsentForTesting,
  resetStorageForTesting,
} from '../../../storage/testing'
import { getCalculationRecords, getPersistenceConsent } from '../../../storage'
import * as storageApi from '../../../storage'

function renderPage() {
  return render(<ReconstitutePage />)
}

function fillField(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillValid(): void {
  fillField('Quantidade no frasco', '5')
  fillField('Volume de diluente', '2')
  fillField('Dose informada', '250')
}

describe('ReconstitutePage — E8', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsentForTesting(false)
    await resetStorageForTesting()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renderiza o formulário completo e o estado inicial sem botão Calcular', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Reconstituir' })).toBeTruthy()
    expect(screen.getByLabelText('Identificação')).toBeTruthy()
    expect(screen.getByLabelText('Quantidade no frasco')).toBeTruthy()
    expect(screen.getByLabelText('Volume de diluente')).toBeTruthy()
    expect(screen.getByLabelText('Dose informada')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Capacidade da seringa' })).toBeTruthy()
    expect(screen.getByLabelText('Graduação da seringa')).toBeTruthy()
    expect(screen.getByText('Preencha os valores para visualizar o cálculo automaticamente.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Calcular' })).toBeNull()
  })

  it('usa campos textuais com inputMode decimal para entradas localizadas', () => {
    renderPage()

    for (const label of ['Quantidade no frasco', 'Volume de diluente', 'Dose informada', 'Graduação da seringa']) {
      const input = screen.getByLabelText(label)
      expect(input).toHaveProperty('type', 'text')
      expect(input.getAttribute('inputmode')).toBe('decimal')
    }
  })

  it('calcula a âncora 5/2/250 automaticamente', () => {
    renderPage()
    fillValid()

    expect(screen.getByText('10 U')).toBeTruthy()
    expect(screen.getByText(/2\.500 mcg\/mL/)).toBeTruthy()
    expect(screen.getByText(/0,1 mL/)).toBeTruthy()
    expect(screen.getByText(/20 doses completas/)).toBeTruthy()
    expect(screen.queryByText(/precisão inferior/i)).toBeNull()
    expect(screen.queryByText(/excede a capacidade selecionada/i)).toBeNull()
  })

  it('aceita vírgula decimal e mantém a graduação 0,5 válida', () => {
    renderPage()
    fillField('Quantidade no frasco', '5')
    fillField('Volume de diluente', '2,5')
    fillField('Dose informada', '250')
    fillField('Graduação da seringa', '0,5')

    expect(screen.getByText(/2\.000 mcg\/mL/)).toBeTruthy()
    expect(screen.getByText(/12,5 U/)).toBeTruthy()
    expect(screen.queryByText(/Os parâmetros de reconstituição informados são inválidos/i)).toBeNull()
  })

  it('mostra 120 U e warning de capacidade sem esconder o resultado', () => {
    renderPage()
    fillField('Quantidade no frasco', '5')
    fillField('Volume de diluente', '2')
    fillField('Dose informada', '3000')

    expect(screen.getByText('120 U')).toBeTruthy()
    expect(screen.getByText(/excede a capacidade selecionada de 100 U/i)).toBeTruthy()
    expect(screen.getByText(/1,2 mL/)).toBeTruthy()
    expect(screen.getByText(/2\.500 mcg\/mL/)).toBeTruthy()
  })

  it('mostra 240 U para 5/4/3000 e mantém warning de capacidade', () => {
    renderPage()
    fillField('Quantidade no frasco', '5')
    fillField('Volume de diluente', '4')
    fillField('Dose informada', '3000')

    expect(screen.getByText('240 U')).toBeTruthy()
    expect(screen.getByText(/2,4 mL/)).toBeTruthy()
    expect(screen.getByText(/1\.250 mcg\/mL/)).toBeTruthy()
    expect(screen.getByText(/excede a capacidade selecionada de 100 U/i)).toBeTruthy()
  })

  it('renderiza a régua com valor real, limites e acessibilidade', () => {
    renderPage()
    fillValid()

    const meter = screen.getByRole('meter')
    expect(meter.getAttribute('aria-valuemin')).toBe('0')
    expect(meter.getAttribute('aria-valuemax')).toBe('100')
    expect(meter.getAttribute('aria-valuenow')).toBe('10')
    expect(meter.getAttribute('aria-valuetext')).toContain('10')
    const tickValues = Array.from(document.querySelectorAll('.reconstitution-gauge__tick span')).map((node) => node.textContent)
    expect(tickValues).toEqual(expect.arrayContaining(['0 U', '25 U', '50 U', '75 U', '100 U']))
  })

  it('comunica overflow da régua sem truncar 120 U', () => {
    renderPage()
    fillField('Quantidade no frasco', '5')
    fillField('Volume de diluente', '2')
    fillField('Dose informada', '3000')

    const meter = screen.getByRole('meter')
    expect(meter.getAttribute('aria-valuenow')).toBe('100')
    expect(meter.getAttribute('aria-valuetext')).toContain('120')
    expect(screen.getByText(/120 U calculadas/i)).toBeTruthy()
  })

  it('mostra o warning de baixa precisão em 9 U e não em 10 U', () => {
    renderPage()
    fillField('Quantidade no frasco', '5')
    fillField('Volume de diluente', '2')
    fillField('Dose informada', '225')
    expect(screen.getByText('9 U')).toBeTruthy()
    expect(screen.getByText(/precisão inferior/i)).toBeTruthy()

    fillField('Dose informada', '250')
    expect(screen.getByText('10 U')).toBeTruthy()
    expect(screen.queryByText(/precisão inferior/i)).toBeNull()
  })

  it('bloqueia 6000 mcg, remove resultado anterior e desabilita ações', () => {
    renderPage()
    fillValid()
    expect(screen.getByText('10 U')).toBeTruthy()

    fillField('Dose informada', '6000')

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('6000 mcg')
    expect(alert.textContent).toContain('5000 mcg')
    expect(screen.queryByText('10 U')).toBeNull()
    expect((screen.getByRole('button', { name: 'Copiar' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Salvar no histórico' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('mostra erros de parsing junto ao campo após interação', () => {
    renderPage()
    fillField('Quantidade no frasco', 'abc')
    fireEvent.blur(screen.getByLabelText('Quantidade no frasco'))

    const input = screen.getByLabelText('Quantidade no frasco')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText(/informe um número válido/i)).toBeTruthy()
  })

  it('não calcula entradas vazias, ambíguas ou infinitas', () => {
    renderPage()
    fillField('Quantidade no frasco', '1.234,56')
    fillField('Volume de diluente', 'Infinity')
    fillField('Dose informada', '')
    expect(screen.queryByText(/Equivalência calculada/i)).toBeNull()
    expect(screen.queryByRole('meter')).toBeNull()
  })

  it('limpa draft, resultado e estados sem apagar o histórico visual da sessão', () => {
    renderPage()
    fillField('Identificação', 'Teste')
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect((screen.getByLabelText('Identificação') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Quantidade no frasco') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Volume de diluente') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Dose informada') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Graduação da seringa') as HTMLInputElement).value).toBe('1')
    expect((screen.getByRole('combobox', { name: 'Capacidade da seringa' }) as HTMLSelectElement).value).toBe('100')
    expect(screen.getByText('Preencha os valores para visualizar o cálculo automaticamente.')).toBeTruthy()
  })

  it('copia texto descritivo neutro e informa sucesso', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    fillValid()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const copied = String(writeText.mock.calls[0]?.[0])
    expect(copied).toContain('250 mcg')
    expect(copied).toContain('2500')
    expect(copied).toContain('0,1')
    expect(copied).toContain('10 U')
    expect(copied).toContain('20')
    expect(copied).not.toMatch(/\b(injete|aplique|puxe|administre)\b/i)
    await waitFor(() => expect(screen.getByText('Copiado')).toBeTruthy())
  })

  it('informa falha de clipboard sem afirmar sucesso', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard indisponível'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    fillValid()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(screen.getByText('Não foi possível copiar')).toBeTruthy())
    expect(screen.queryByText('Copiado')).toBeNull()
  })

  it('não salva automaticamente e salva somente após ação explícita', async () => {
    renderPage()
    fillValid()
    expect(await getCalculationRecords()).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar no histórico' }))
    await waitFor(async () => expect(await getCalculationRecords()).toHaveLength(1))
    expect(screen.getByText(/Salvo no histórico desta sessão/i)).toBeTruthy()
  })

  it('salva o CalculationRecord completo com input, snapshot e versões', async () => {
    renderPage()
    fillField('Identificação', 'Âncora')
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar no histórico' }))

    await waitFor(async () => {
      const [record] = await getCalculationRecords()
      expect(record?.type).toBe('reconstitution')
      if (record?.type !== 'reconstitution') return
      expect(record.display.title).toBe('Reconstituição — Âncora')
      expect(record.input.vialMassMg).toBe(5)
      expect(record.input.diluentVolumeMl).toBe(2)
      expect(record.input.desiredDoseMcg).toBe(250)
      expect(record.input.syringe.family).toBe('U-100')
      expect(record.input.syringe.unitsPerMl).toBe(100)
      expect(record.resultSnapshot.concentrationMcgPerMl).toBe(2500)
      expect(record.resultSnapshot.syringeUnits).toBeCloseTo(10)
      expect(record.resultSnapshot.theoreticalMaxDoses).toBe(20)
      expect(record.versions.reconstitutionEngineVersion).toBe(record.resultSnapshot.metadata.reconstitutionEngineVersion)
      expect(record.versions.datasetVersion).toBe(1)
    })
  })

  it('respeita capacidade escolhida de 30 U e mantém 120 U como valor real', () => {
    renderPage()
    fillValid()
    fireEvent.change(screen.getByRole('combobox', { name: 'Capacidade da seringa' }), { target: { value: '30' } })
    expect(screen.getByText('10 U')).toBeTruthy()
    expect(screen.queryByText(/capacidade selecionada de 30 U/i)).toBeNull()
  })

  it('constrói snapshot estrutural sem recalcular o resultado', () => {
    const input: ReconstitutionInput = {
      vialMassMg: 5,
      diluentVolumeMl: 2,
      desiredDoseMcg: 250,
      syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
      label: 'Snapshot',
    }
    const calculation = calculateReconstitution(input)
    expect(calculation.ok).toBe(true)
    if (!calculation.ok) return

    const record = createReconstitutionCalculationRecord({
      id: 'reconstitution-test-id',
      createdAt: '2026-08-28T12:00:00.000Z',
      input,
      result: calculation.value,
    })
    input.syringe.capacityUnits = 30
    calculation.value.warnings.length = 0

    expect(record.display.title).toBe('Reconstituição — Snapshot')
    expect(record.type).toBe('reconstitution')
    if (record.type !== 'reconstitution') return
    expect(record.input.syringe.capacityUnits).toBe(100)
    expect(record.resultSnapshot.warnings).toContain('THEORETICAL_YIELD')
  })

  it('com consentimento ligado informa persistência confirmada', async () => {
    setPersistenceConsentForTesting(true)
    renderPage()
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar no histórico' }))

    await waitFor(async () => expect(await getCalculationRecords()).toHaveLength(1))
    expect(getPersistenceConsent()).toBe(true)
    expect(screen.getByText('Registro salvo no histórico.')).toBeTruthy()
  })

  it('não afirma sucesso quando a API de histórico retorna falha', async () => {
    vi.spyOn(storageApi, 'addCalculationRecord').mockResolvedValue({
      ok: false,
      error: { internalReason: 'falha simulada' },
    })
    renderPage()
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar no histórico' }))

    await waitFor(() => expect(screen.getByText('Não foi possível salvar este registro no histórico.')).toBeTruthy())
    expect(screen.queryByText(/Salvo no histórico/)).toBeNull()
    expect(await getCalculationRecords()).toHaveLength(0)
  })
})
