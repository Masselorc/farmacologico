import { messages } from '../../../app/i18n/pt-BR.messages'
import { AdminCard } from './AdminCard'
import { EstimateChips } from './EstimateChips'
import type { CalendarCell, CalendarOccurrence } from '../lib/calendar'
import type { ProtocolDayEstimate } from '../lib/estimates'
import type { LocalDate, Protocol } from '../../../domain/types'

export interface AgendaListProps {
  cells: ReadonlyArray<CalendarCell>
  occurrencesByDate: Map<LocalDate, CalendarOccurrence[]>
  estimatesByDate: Map<LocalDate, ProtocolDayEstimate[]>
  onEdit: (protocol: Protocol) => void
  onMove: (protocol: Protocol, sourceDate: LocalDate) => void
  onDelete: (protocol: Protocol) => void
  onReschedule: (protocol: Protocol, deltaDays: number) => void
  onCellClick?: (date: LocalDate, occurrences: CalendarOccurrence[]) => void
}

export function AgendaList({
  cells,
  occurrencesByDate,
  estimatesByDate,
  onEdit,
  onMove,
  onDelete,
  onReschedule,
  onCellClick,
}: AgendaListProps) {
  // Filtra dias que possuem administrações ou estimativas
  const activeDays = cells.filter((c) => {
    const occs = occurrencesByDate.get(c.localDate)
    return occs && occs.length > 0
  })

  if (activeDays.length === 0) {
    return (
      <div className="protocol-agenda-empty" role="status">
        <p>{messages.protocols.noOccurrencesInWindow}</p>
      </div>
    )
  }

  return (
    <div className="protocol-agenda-list" role="feed" aria-label="Agenda de administrações">
      {activeDays.map((cell) => {
        const occurrences = occurrencesByDate.get(cell.localDate) || []
        const estimates = estimatesByDate.get(cell.localDate) || []

        return (
          <article
            key={cell.localDate}
            className="protocol-agenda-day-group"
            data-drop-date={cell.localDate}
          >
            <div className="agenda-day-header">
              <h4 className="agenda-day-date">
                {cell.localDate}
                {cell.isToday && <span className="cell-today-badge">Hoje</span>}
              </h4>
              {estimates.length > 0 && <EstimateChips estimates={estimates} />}
            </div>

            <div className="agenda-day-cards">
              {occurrences.map((occ) => (
                <AdminCard
                  key={`${occ.protocol.id}:${occ.instantMs}`}
                  protocol={occ.protocol}
                  sourceDate={occ.localDate}
                  localTime={occ.localTime}
                  onEdit={onEdit}
                  onMove={onMove}
                  onDelete={onDelete}
                  onReschedule={onReschedule}
                  onCardClick={() => onCellClick?.(cell.localDate, occurrences)}
                />
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}
