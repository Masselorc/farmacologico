export const messages = {
  appName: 'FARMakit',
  navLabel: 'Navegação principal',
  nav: {
    biblioteca: 'Biblioteca',
    meiaVida: 'Meia-vida',
    reconstituir: 'Reconstituir',
    protocolos: 'Protocolos',
    historico: 'Histórico',
    ajustes: 'Ajustes',
  },
  pages: {
    biblioteca: 'Biblioteca — implementação prevista na E10.',
    meiaVida: 'Meia-vida (Comparador) — implementação prevista na E9.',
    reconstituir: 'Reconstituir — implementação prevista na E8.',
    protocolos: 'Protocolos — implementação prevista na E11.',
    historico: 'Histórico — implementação prevista na E12.',
    ajustes: 'Ajustes — implementação prevista na E6/E13.',
    spike: 'Spike técnico da E1 — dados fictícios; nenhum gráfico farmacocinético.',
    naoEncontrada: 'Página não encontrada.',
  },
} as const

export type Messages = typeof messages

export * from './pt-BR.errors'

