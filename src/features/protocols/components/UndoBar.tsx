import { useEffect } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { UNDO_AUTO_DISMISS_MS, type UndoMovementState } from '../lib/movement'

export interface UndoBarProps {
  undoState: UndoMovementState | null
  onUndo: () => void
  onDismiss: () => void
}

export function UndoBar({ undoState, onUndo, onDismiss }: UndoBarProps) {
  useEffect(() => {
    if (!undoState) return undefined

    const timer = setTimeout(() => {
      onDismiss()
    }, UNDO_AUTO_DISMISS_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [undoState, onDismiss])

  if (!undoState) {
    return null
  }

  return (
    <div
      className="protocol-undo-bar"
      role="status"
      aria-live="polite"
    >
      <span className="undo-message">
        {messages.protocols.rescheduledNotice(undoState.protocolName)}
      </span>
      <button
        type="button"
        className="protocol-undo-btn"
        onClick={onUndo}
      >
        {messages.protocols.undoAction}
      </button>
    </div>
  )
}
