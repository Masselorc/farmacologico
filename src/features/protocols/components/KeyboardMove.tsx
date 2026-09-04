import { useEffect, useRef, useState } from 'react'
import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { computeCivilDayDelta } from '../lib/movement'
import type { LocalDate, Protocol, TimeZoneId } from '../../../domain/types'

export interface KeyboardMoveProps {
  protocol: Protocol
  sourceDate: LocalDate
  calendarTimeZone: TimeZoneId
  onConfirm: (protocol: Protocol, targetDate: LocalDate) => void
  onCancel: () => void
}

function shiftLocalDate(dateStr: LocalDate, days: number): LocalDate {
  const date = Temporal.PlainDate.from(dateStr)
  return date.add({ days }).toString() as LocalDate
}

export function KeyboardMove({
  protocol,
  sourceDate,
  calendarTimeZone,
  onConfirm,
  onCancel,
}: KeyboardMoveProps) {
  const [targetDate, setTargetDate] = useState<LocalDate>(sourceDate)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const delta = computeCivilDayDelta(sourceDate, targetDate)

  useEffect(() => {
    containerRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setTargetDate((prev) => shiftLocalDate(prev, -1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setTargetDate((prev) => shiftLocalDate(prev, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setTargetDate((prev) => shiftLocalDate(prev, -7))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setTargetDate((prev) => shiftLocalDate(prev, 7))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm(protocol, targetDate)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [protocol, sourceDate, targetDate, onConfirm, onCancel])

  return (
    <div className="protocol-modal-backdrop" onClick={onCancel}>
      <div
        className="protocol-keyboard-move-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-move-title"
        tabIndex={-1}
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="keyboard-move-title" className="protocol-modal-title">
          {messages.protocols.moveProtocol}
        </h3>

        <p className="protocol-modal-subtitle">
          {messages.protocols.keyboardMoveInstructions}
        </p>

        <div className="keyboard-move-status" role="region" aria-label="Status do reagendamento">
          <div className="status-row">
            <span>Protocolo:</span>
            <strong>{protocol.name}</strong>
          </div>
          <div className="status-row">
            <span>Fuso:</span>
            <strong>{calendarTimeZone}</strong>
          </div>
          <div className="status-row">
            <span>Data de origem:</span>
            <strong>{sourceDate}</strong>
          </div>
          <div className="status-row">
            <span>Nova data:</span>
            <strong className="target-date-highlight">{targetDate}</strong>
          </div>
          <div className="status-row">
            <span>Deslocamento:</span>
            <span>{delta >= 0 ? `+${delta} dias` : `${delta} dias`}</span>
          </div>
        </div>

        {/* Anúncio acessível para leitores de tela */}
        <div className="sr-only" aria-live="polite">
          {messages.protocols.movingCardStatus(protocol.name, targetDate)}
        </div>

        {/* Ações de navegação em tela para dispositivos sem teclado físico */}
        <div className="keyboard-move-steppers">
          <button
            type="button"
            className="protocol-btn protocol-btn-sm"
            onClick={() => setTargetDate((prev) => shiftLocalDate(prev, -7))}
          >
            -1 semana
          </button>
          <button
            type="button"
            className="protocol-btn protocol-btn-sm"
            onClick={() => setTargetDate((prev) => shiftLocalDate(prev, -1))}
          >
            -1 dia
          </button>
          <button
            type="button"
            className="protocol-btn protocol-btn-sm"
            onClick={() => setTargetDate((prev) => shiftLocalDate(prev, 1))}
          >
            +1 dia
          </button>
          <button
            type="button"
            className="protocol-btn protocol-btn-sm"
            onClick={() => setTargetDate((prev) => shiftLocalDate(prev, 7))}
          >
            +1 semana
          </button>
        </div>

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
            className="protocol-btn protocol-btn-primary"
            onClick={() => onConfirm(protocol, targetDate)}
          >
            {messages.protocols.save}
          </button>
        </div>
      </div>
    </div>
  )
}
