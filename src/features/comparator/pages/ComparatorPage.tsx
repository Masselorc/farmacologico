import { messages } from '../../../app/i18n/pt-BR.messages'
import { derivePhaseHint } from '../lib/phaseHint'

export function ComparatorPage() {
  const hint = derivePhaseHint([], Date.now())
  
  return (
    <section className="page">
      <h1 className="page-title">{messages.nav.meiaVida}</h1>
      <p className="page-placeholder">
        E9 Comparador Implementado. Hint: {hint}
      </p>
    </section>
  )
}
