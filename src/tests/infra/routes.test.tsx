import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppRoot } from '../../app/AppRoot'
import { messages } from '../../app/i18n/pt-BR.messages'

const structuralRoutes = [
  { label: messages.nav.biblioteca, placeholder: messages.pages.biblioteca },
  { label: messages.nav.meiaVida, placeholder: messages.pages.meiaVida },
  { label: messages.nav.reconstituir, placeholder: messages.pages.reconstituir },
  { label: messages.nav.protocolos, placeholder: messages.pages.protocolos },
  { label: messages.nav.historico, placeholder: messages.pages.historico },
  { label: messages.nav.ajustes, placeholder: messages.pages.ajustes },
] as const

describe('shell estrutural', () => {
  it('exibe as seis rotas obrigatórias na navegação', () => {
    render(<AppRoot />)
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
    render(<AppRoot />)
    await waitFor(() => {
      expect(window.location.hash).toBe('#/biblioteca')
    })
    expect(await screen.findByText(messages.pages.biblioteca)).toBeTruthy()
  })

  it('navega por todas as rotas estruturais via hash', async () => {
    render(<AppRoot />)
    for (const route of structuralRoutes) {
      fireEvent.click(screen.getByRole('link', { name: route.label }))
      expect(await screen.findByText(route.placeholder)).toBeTruthy()
    }
  })

  it('exibe página não encontrada para rota desconhecida', async () => {
    window.location.hash = '#/rota-inexistente'
    render(<AppRoot />)
    expect(
      await screen.findByText(messages.pages.naoEncontrada),
    ).toBeTruthy()
  })
})
