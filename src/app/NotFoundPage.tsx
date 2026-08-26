import { useLocation } from 'react-router-dom'
import { messages } from './i18n/pt-BR.messages'

export function NotFoundPage() {
  const location = useLocation()

  return (
    <section className="page">
      <h1 className="page-title">{messages.pages.naoEncontrada}</h1>
      <p className="page-placeholder">{location.pathname}</p>
    </section>
  )
}
