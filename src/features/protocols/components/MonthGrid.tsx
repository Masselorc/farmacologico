import { AdminCard } from './AdminCard'
import { EstimateChips } from './EstimateChips'
import type { CalendarCell, CalendarOccurrence } from '../lib/calendar'
import type { ProtocolDayEstimate } from '../lib/estimates'
import type { LocalDate, Protocol } from '../../../domain/types'

export interface MonthGridProps {
  cells: ReadonlyArray<CalendarCell>
  occurrencesByDate: Map<LocalDate, CalendarOccurrence[]>
  estimatesByDate: Map<LocalDate, ProtocolDayEstimate[]>
  onEdit: (protocol: Protocol) => void
  onMove: (protocol: Protocol, sourceDate: LocalDate) => void
  onDelete: (protocol: Protocol) => void
  onReschedule: (protocol: Protocol, deltaDays: number) => void
  onCellClick?: (date: LocalDate, occurrences: CalendarOccurrence[]) => void
}

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export function MonthGrid({
  cells,
  occurrencesByDate,
  estimatesByDate,
  onEdit,
  onMove,
  onDelete,
  onReschedule,
  onCellClick,
}: MonthGridProps) {
  return (
    <div className="protocol-month-grid-wrapper" role="region" aria-label="Visualização mensal">
      <div className="protocol-grid-header-row" role="row">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="protocol-grid-header-cell" role="columnheader">
            {name.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className="protocol-month-grid" role="grid">
        {cells.map((cell) => {
          const occurrences = occurrencesByDate.get(cell.localDate) || []
          const estimates = estimatesByDate.get(cell.localDate) || []

          return (
            <div
              key={cell.localDate}
              className={`protocol-calendar-cell ${cell.isCurrentMonth ? 'in-month' : 'out-month'} ${cell.isToday ? 'is-today' : ''}`}
              data-drop-date={cell.localDate}
              role="gridcell"
              aria-label={`${cell.localDate}, ${occurrences.length} administrações`}
              onClick={() => onCellClick?.(cell.localDate, occurrences)}
            >
              <div className="cell-header">
                <span className="cell-day-number">{cell.dayOfMonth}</span>
                {cell.isToday && <span className="cell-today-badge">Hoje</span>}
              </div>

              {estimates.length > 0 && (
                <div className="cell-estimates">
                  <EstimateChips estimates={estimates} />
                </div>
              )}

              <div className="cell-occurrences">
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
