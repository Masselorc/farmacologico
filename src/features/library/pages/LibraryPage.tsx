import { messages } from '../../../app/i18n/pt-BR.messages'

export function LibraryPage() {
  return (
    <section className="page">
      <h1 className="page-title">{messages.nav.biblioteca}</h1>
      <p className="page-placeholder">{messages.pages.biblioteca}</p>
    </section>
  )
}
