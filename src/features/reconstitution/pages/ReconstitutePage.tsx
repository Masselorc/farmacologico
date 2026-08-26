import { messages } from '../../../app/i18n/pt-BR.messages'

export function ReconstitutePage() {
  return (
    <section className="page">
      <h1 className="page-title">{messages.nav.reconstituir}</h1>
      <p className="page-placeholder">{messages.pages.reconstituir}</p>
    </section>
  )
}
