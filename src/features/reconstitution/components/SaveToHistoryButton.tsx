import { messages } from '../../../app/i18n/pt-BR.messages'

interface SaveToHistoryButtonProps {
  disabled: boolean
  saving: boolean
  onSave: () => void | Promise<void>
}

export function SaveToHistoryButton({ disabled, saving, onSave }: SaveToHistoryButtonProps) {
  return (
    <button
      type="button"
      className="reconstitution-button reconstitution-button--secondary"
      onClick={() => void onSave()}
      disabled={disabled || saving}
      aria-busy={saving ? 'true' : 'false'}
    >
      {saving ? messages.reconstitution.saving : messages.reconstitution.save}
    </button>
  )
}
