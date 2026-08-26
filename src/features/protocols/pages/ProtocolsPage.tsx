import { messages } from '../../../app/i18n/pt-BR.messages'

export function ProtocolsPage() {
  return (
    <section className="page">
      <h1 className="page-title">{messages.nav.protocolos}</h1>
      <p className="page-placeholder">{messages.pages.protocolos}</p>
    </section>
  )
}
