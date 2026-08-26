import { messages } from '../../../app/i18n/pt-BR.messages'

export function HistoryPage() {
  return (
    <section className="page">
      <h1 className="page-title">{messages.nav.historico}</h1>
      <p className="page-placeholder">{messages.pages.historico}</p>
    </section>
  )
}
