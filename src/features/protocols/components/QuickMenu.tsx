import { useEffect, useRef, useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'

export interface QuickMenuProps {
  protocolName: string
  onEdit: () => void
  onMove: () => void
  onDelete: () => void
}

export function QuickMenu({
  protocolName,
  onEdit,
  onMove,
  onDelete,
}: QuickMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="protocol-quick-menu-container" ref={menuRef}>
      <button
        type="button"
        ref={triggerRef}
        className="protocol-quick-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={messages.protocols.quickMenuAria(protocolName)}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
      >
        <span aria-hidden="true">⋮</span>
      </button>

      {isOpen && (
        <div className="protocol-quick-menu-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="protocol-quick-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              onEdit()
            }}
          >
            {messages.protocols.editProtocol}
          </button>
          <button
            type="button"
            role="menuitem"
            className="protocol-quick-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              onMove()
            }}
          >
            {messages.protocols.moveProtocol}
          </button>
          <button
            type="button"
            role="menuitem"
            className="protocol-quick-menu-item delete-action"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              onDelete()
            }}
          >
            {messages.protocols.deleteProtocol}
          </button>
        </div>
      )}
    </div>
  )
}
