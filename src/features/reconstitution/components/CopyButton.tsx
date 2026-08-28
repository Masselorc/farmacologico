import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'

interface CopyButtonProps {
  text: string
  disabled: boolean
}

type CopyStatus = { kind: 'success' | 'failure'; text: string } | undefined

export function CopyButton({ text, disabled }: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>()
  const statusForCurrentText = !disabled && status?.text === text ? status.kind : undefined

  async function handleCopy(): Promise<void> {
    if (disabled || text.length === 0) return

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API indisponível')
      }
      await navigator.clipboard.writeText(text)
      setStatus({ kind: 'success', text })
    } catch {
      setStatus({ kind: 'failure', text })
    }
  }

  return (
    <div className="reconstitution-action">
      <button type="button" className="reconstitution-button" onClick={() => void handleCopy()} disabled={disabled}>
        {messages.reconstitution.copy}
      </button>
      <span className="reconstitution-status" aria-live="polite">
        {statusForCurrentText === 'success' ? messages.reconstitution.copied : null}
        {statusForCurrentText === 'failure' ? messages.reconstitution.copyFailure : null}
      </span>
    </div>
  )
}
