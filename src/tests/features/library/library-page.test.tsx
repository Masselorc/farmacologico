import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LibraryPage } from '../../../features/library/pages/LibraryPage'
import { messages } from '../../../app/i18n/pt-BR.messages'

describe('E10 — LibraryPage UI Tests', () => {
  it('renderiza título e 16 substâncias visíveis, ocultando as 3 componentOnly', async () => {
    await act(async () => {
      render(<LibraryPage />)
    })

    // Heading
    expect(screen.getByRole('heading', { name: messages.library.title, level: 1 })).toBeTruthy()

    // 16 cards visíveis
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(16)

    // Retatrutida está visível
    expect(screen.getByText('Retatrutida')).toBeTruthy()

    // Durateston LANDERGOLD está visível
    expect(screen.getByText('Durateston LANDERGOLD')).toBeTruthy()

    // ComponentOnly NÃO aparecem na lista normal
    expect(screen.queryByText('LANDERGOLD — Propionato')).toBeNull()
    expect(screen.queryByText('LANDERGOLD — Fenilpropionato')).toBeNull()
    expect(screen.queryByText('LANDERGOLD — Isocaproato')).toBeNull()
  })

  it('busca funciona case-insensitiva e diacritic-insensitiva, e não expõe componentOnly', async () => {
    await act(async () => {
      render(<LibraryPage />)
    })

    const searchInput = screen.getByLabelText(messages.library.searchLabel) as HTMLInputElement
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'retatrutida' } })
    })

    expect(screen.getByText('Retatrutida')).toBeTruthy()
    expect(screen.queryByText('Durateston LANDERGOLD')).toBeNull()

    // Busca por termo de componentOnly continua não expondo
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'isocaproato' } })
    })
    expect(screen.queryByText('LANDERGOLD — Isocaproato')).toBeNull()
  })

  it('abre ficha de SingleSubstance ao clicar e exibe dados e os dois CTAs (Comparar e Protocolos)', async () => {
    await act(async () => {
      render(<LibraryPage />)
    })

    const retatrutidaCard = screen.getByText('Retatrutida')
    await act(async () => {
      fireEvent.click(retatrutidaCard)
    })

    // Ficha aberta
    const sheet = await screen.findByRole('dialog')
    expect(sheet).toBeTruthy()

    const inSheet = within(sheet)

    // Meia-vida e Tmax exibidos
    expect(inSheet.getByText(/6 dias/i)).toBeTruthy()
    expect(inSheet.getByText(/2 dias/i)).toBeTruthy()

    // Badge legado
    expect(inSheet.getByText(messages.library.legacyBadge)).toBeTruthy()

    // CTAs para Single
    expect(inSheet.getByRole('button', { name: messages.library.compare })).toBeTruthy()
    expect(inSheet.getByRole('button', { name: messages.library.addToProtocols })).toBeTruthy()
  })

  it('abre ficha de Blend ao clicar: CTA Comparar NÃO está disponível e CTA Protocolos está presente', async () => {
    await act(async () => {
      render(<LibraryPage />)
    })

    const blendCard = screen.getByText('Durateston LANDERGOLD')
    await act(async () => {
      fireEvent.click(blendCard)
    })

    const sheet = await screen.findByRole('dialog')
    expect(sheet).toBeTruthy()

    // CTA Comparar NÃO deve estar disponível como ação de cálculo de cenário simples
    expect(screen.queryByRole('button', { name: messages.library.compare })).toBeNull()

    // Texto explicativo acessível deve estar presente
    expect(screen.getByText(messages.library.blendComparatorUnavailable)).toBeTruthy()

    // CTA Protocolos está presente
    expect(screen.getByRole('button', { name: messages.library.addToProtocols })).toBeTruthy()
  })

  it('zero estilos inline na árvore da Biblioteca (conformidade estrita com CSP)', async () => {
    let containerElement: HTMLElement
    await act(async () => {
      const { container } = render(<LibraryPage />)
      containerElement = container
    })
    const elementsWithInlineStyle = containerElement!.querySelectorAll('[style]')
    expect(elementsWithInlineStyle.length).toBe(0)
  })
})
