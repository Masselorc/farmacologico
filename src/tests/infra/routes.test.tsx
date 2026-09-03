import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppRoot } from '../../app/AppRoot'
import { messages } from '../../app/i18n/pt-BR.messages'

const structuralRoutes = [
  { label: messages.nav.biblioteca, expectedContent: messages.library.subtitle },
  { label: messages.nav.meiaVida, expectedContent: messages.pages.meiaVida },
  { label: messages.nav.reconstituir, expectedContent: messages.pages.reconstituir },
  { label: messages.nav.protocolos, expectedContent: messages.pages.protocolos },
  { label: messages.nav.historico, expectedContent: messages.pages.historico },
  { label: messages.nav.ajustes, expectedContent: messages.pages.ajustes },
] as const

describe('shell estrutural', () => {
  it('exibe as seis rotas obrigatórias na navegação', async () => {
    await act(async () => {
      render(<AppRoot />)
    })
    const nav = screen.getByRole('navigation', { name: messages.navLabel })
    expect(nav).toBeTruthy()
    for (const route of structuralRoutes) {
      expect(
        screen.getByRole('link', { name: route.label }),
      ).toBeTruthy()
    }
  })

  it('redireciona a raiz para /biblioteca', async () => {
    window.location.hash = ''
    await act(async () => {
      render(<AppRoot />)
    })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/biblioteca')
    })
    expect(await screen.findByText(messages.library.subtitle)).toBeTruthy()
  })

  it('navega por todas as rotas estruturais via hash', async () => {
    await act(async () => {
      render(<AppRoot />)
    })
    for (const route of structuralRoutes) {
      await act(async () => {
        fireEvent.click(screen.getByRole('link', { name: route.label }))
      })
      expect(await screen.findByText(route.expectedContent)).toBeTruthy()
    }
  })

  it('exibe página não encontrada para rota desconhecida', async () => {
    window.location.hash = '#/rota-inexistente'
    await act(async () => {
      render(<AppRoot />)
    })
    expect(
      await screen.findByText(messages.pages.naoEncontrada),
    ).toBeTruthy()
  })
})
