import { AdminCard } from './AdminCard'
import { EstimateChips } from './EstimateChips'
import type { CalendarCell, CalendarOccurrence } from '../lib/calendar'
import type { ProtocolDayEstimate } from '../lib/estimates'
import type { LocalDate, Protocol } from '../../../domain/types'

export interface WeekStripProps {
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

export function WeekStrip({
  cells,
  occurrencesByDate,
  estimatesByDate,
  onEdit,
  onMove,
  onDelete,
  onReschedule,
  onCellClick,
}: WeekStripProps) {
  return (
    <div className="protocol-week-strip-wrapper" role="region" aria-label="Visualização semanal">
      <div className="protocol-week-strip" role="grid">
        {cells.map((cell, idx) => {
          const occurrences = occurrencesByDate.get(cell.localDate) || []
          const estimates = estimatesByDate.get(cell.localDate) || []
          const dayName = WEEKDAY_NAMES[idx] || ''

          return (
            <div
              key={cell.localDate}
              className={`protocol-calendar-cell protocol-week-column ${cell.isToday ? 'is-today' : ''}`}
              data-drop-date={cell.localDate}
              role="gridcell"
              aria-label={`${dayName}, ${cell.localDate}`}
              onClick={() => onCellClick?.(cell.localDate, occurrences)}
            >
              <div className="cell-header">
                <span className="cell-day-name">{dayName.slice(0, 3)}</span>
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
