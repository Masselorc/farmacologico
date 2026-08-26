import { messages } from '../../../app/i18n/pt-BR.messages'

export function SettingsPage() {
  return (
    <section className="page">
      <h1 className="page-title">{messages.nav.ajustes}</h1>
      <p className="page-placeholder">{messages.pages.ajustes}</p>
    </section>
  )
}
