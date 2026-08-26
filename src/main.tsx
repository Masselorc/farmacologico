import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { AppRoot } from './app/AppRoot'
import './styles/tokens.css'

// PWA prompt-update (§7): o SW aguarda confirmação explícita.
// A UX final do banner pertence à E13; aqui registramos apenas a integração mínima.
registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event('farmakit:sw-update-available'))
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
