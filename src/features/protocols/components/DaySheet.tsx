import { useEffect, useRef } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { AdminCard } from './AdminCard'
import { EstimateChips } from './EstimateChips'
import type { LocalDate, Protocol } from '../../../domain/types'
import type { CalendarOccurrence } from '../lib/calendar'
import type { ProtocolDayEstimate } from '../lib/estimates'

export interface DaySheetProps {
  isOpen: boolean
  date: LocalDate
  occurrences: ReadonlyArray<CalendarOccurrence>
  estimates: ReadonlyArray<ProtocolDayEstimate>
  onClose: () => void
  onEdit: (protocol: Protocol) => void
  onMove: (protocol: Protocol, sourceDate: LocalDate) => void
  onDelete: (protocol: Protocol) => void
  onReschedule: (protocol: Protocol, deltaDays: number) => void
}

export function DaySheet({
  isOpen,
  date,
  occurrences,
  estimates,
  onClose,
  onEdit,
  onMove,
  onDelete,
  onReschedule,
}: DaySheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="protocol-modal-backdrop day-sheet-backdrop" onClick={onClose}>
      <div
        className="protocol-day-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={messages.protocols.daySheetTitle(date)}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="day-sheet-header">
          <h3 className="day-sheet-title">{messages.protocols.daySheetTitle(date)}</h3>
          <button
            type="button"
            className="protocol-btn-icon day-sheet-close-btn"
            onClick={onClose}
            aria-label={messages.protocols.daySheetClose}
          >
            ✕
          </button>
        </div>

        {estimates.length > 0 && (
          <div className="day-sheet-estimates">
            <EstimateChips estimates={estimates} />
          </div>
        )}

        <div className="day-sheet-occurrences">
          {occurrences.length === 0 ? (
            <p className="day-sheet-empty">{messages.protocols.noOccurrencesInWindow}</p>
          ) : (
            occurrences.map((occ) => (
              <AdminCard
                key={`${occ.protocol.id}:${occ.instantMs}`}
                protocol={occ.protocol}
                sourceDate={occ.localDate}
                localTime={occ.localTime}
                onEdit={onEdit}
                onMove={onMove}
                onDelete={onDelete}
                onReschedule={onReschedule}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
