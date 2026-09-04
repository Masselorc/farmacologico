import { useEffect, useRef } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'

export interface DeleteProtocolModalProps {
  isOpen: boolean
  protocolName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteProtocolModal({
  isOpen,
  protocolName,
  onConfirm,
  onCancel,
}: DeleteProtocolModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    // Foca o botão de confirmação ao abrir o modal
    confirmBtnRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div className="protocol-modal-backdrop" onClick={onCancel}>
      <div
        className="protocol-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-protocol-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-protocol-title" className="protocol-modal-title">
          {messages.protocols.confirmDeleteTitle}
        </h3>
        <p className="protocol-modal-message">
          {messages.protocols.confirmDeleteMessage(protocolName)}
        </p>

        <div className="protocol-modal-actions">
          <button
            type="button"
            className="protocol-btn protocol-btn-secondary"
            onClick={onCancel}
          >
            {messages.protocols.cancel}
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className="protocol-btn protocol-btn-danger"
            onClick={onConfirm}
          >
            {messages.protocols.confirmDelete}
          </button>
        </div>
      </div>
    </div>
  )
}
