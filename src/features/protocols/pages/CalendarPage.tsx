import { useMemo, useState } from 'react'
import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../../app/i18n/pt-BR.messages'
import {
  buildAgendaDays,
  buildMonthCells,
  buildWeekCells,
  collectWindowOccurrences,
  deriveViewDisplayWindow,
  navigatePeriod,
  todayLocalDate,
  type CalendarCell,
  type CalendarOccurrence,
  type CalendarViewMode,
} from '../lib/calendar'
import { evaluateDayProtocolEstimates, type ProtocolDayEstimate } from '../lib/estimates'
import { MonthGrid } from '../components/MonthGrid'
import { WeekStrip } from '../components/WeekStrip'
import { AgendaList } from '../components/AgendaList'
import { DaySheet } from '../components/DaySheet'
import type { LocalDate, Protocol, TimeZoneId } from '../../../domain/types'

export interface CalendarPageProps {
  protocols: ReadonlyArray<Protocol>
  calendarTimeZone: TimeZoneId
  onNewProtocol: () => void
  onEditProtocol: (protocol: Protocol) => void
  onMoveProtocol: (protocol: Protocol, sourceDate: LocalDate) => void
  onDeleteProtocol: (protocol: Protocol) => void
  onRescheduleProtocol: (protocol: Protocol, deltaDays: number) => void
}

export function CalendarPage({
  protocols,
  calendarTimeZone,
  onNewProtocol,
  onEditProtocol,
  onMoveProtocol,
  onDeleteProtocol,
  onRescheduleProtocol,
}: CalendarPageProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [anchorDate, setAnchorDate] = useState<LocalDate>(() => todayLocalDate(calendarTimeZone))
  const [selectedDay, setSelectedDay] = useState<{
    date: LocalDate
    occurrences: CalendarOccurrence[]
  } | null>(null)

  // Deriva janela de exibição correspondente ao período visível
  const displayWindow = useMemo(
    () => deriveViewDisplayWindow(viewMode, anchorDate, calendarTimeZone),
    [viewMode, anchorDate, calendarTimeZone],
  )

  // Constrói células da grade de acordo com o modo
  const cells = useMemo<CalendarCell[]>(() => {
    if (viewMode === 'month') {
      return buildMonthCells(anchorDate, calendarTimeZone)
    }
    if (viewMode === 'week') {
      return buildWeekCells(anchorDate, calendarTimeZone)
    }
    return buildAgendaDays(anchorDate, 30, calendarTimeZone)
  }, [viewMode, anchorDate, calendarTimeZone])

  // Coleta ocorrências ativas dentro da janela de exibição
  const occurrences = useMemo(
    () => collectWindowOccurrences(protocols, displayWindow, calendarTimeZone),
    [protocols, displayWindow, calendarTimeZone],
  )

  // Agrupa ocorrências por data civil
  const occurrencesByDate = useMemo(() => {
    const map = new Map<LocalDate, CalendarOccurrence[]>()
    for (const occ of occurrences) {
      const list = map.get(occ.localDate) || []
      list.push(occ)
      map.set(occ.localDate, list)
    }
    return map
  }, [occurrences])

  // Avalia estimativas PK (às 20:00) para cada célula visível
  const estimatesByDate = useMemo(() => {
    const map = new Map<LocalDate, ProtocolDayEstimate[]>()
    for (const cell of cells) {
      const ests = evaluateDayProtocolEstimates(protocols, cell.localDate, calendarTimeZone)
      if (ests.length > 0) {
        map.set(cell.localDate, ests)
      }
    }
    return map
  }, [cells, protocols, calendarTimeZone])

  const handleNavigate = (direction: -1 | 1) => {
    setAnchorDate((prev) => navigatePeriod(prev, viewMode, direction))
  }

  const handleGoToday = () => {
    setAnchorDate(todayLocalDate(calendarTimeZone))
  }

  const handleCellClick = (date: LocalDate, cellOccs: CalendarOccurrence[]) => {
    setSelectedDay({ date, occurrences: cellOccs })
  }

  // Título amigável do período
  const periodLabel = useMemo(() => {
    const plain = Temporal.PlainDate.from(anchorDate)
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ]
    const monthName = monthNames[plain.month - 1] || ''
    if (viewMode === 'month') {
      return `${monthName} de ${plain.year}`
    }
    if (viewMode === 'week') {
      return `Semana de ${plain.day} de ${monthName} de ${plain.year}`
    }
    return `Agenda a partir de ${plain.day} de ${monthName}`
  }, [anchorDate, viewMode])

  return (
    <div className="protocol-calendar-page">
      <div className="protocol-calendar-toolbar">
        <div className="toolbar-navigation">
          <div className="period-nav-buttons">
            <button
              type="button"
              className="protocol-btn protocol-btn-icon"
              onClick={() => handleNavigate(-1)}
              aria-label={messages.protocols.prevPeriod}
            >
              ◀
            </button>
            <button
              type="button"
              className="protocol-btn protocol-btn-sm"
              onClick={handleGoToday}
            >
              {messages.protocols.today}
            </button>
            <button
              type="button"
              className="protocol-btn protocol-btn-icon"
              onClick={() => handleNavigate(1)}
              aria-label={messages.protocols.nextPeriod}
            >
              ▶
            </button>
          </div>

          <h3 className="protocol-period-title">{periodLabel}</h3>
        </div>

        <div className="toolbar-actions">
          <div className="view-mode-selector" role="radiogroup" aria-label={messages.protocols.viewModeLabel}>
            <button
              type="button"
              className={`protocol-tab-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
              role="radio"
              aria-checked={viewMode === 'month'}
            >
              {messages.protocols.viewMonth}
            </button>
            <button
              type="button"
              className={`protocol-tab-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
              role="radio"
              aria-checked={viewMode === 'week'}
            >
              {messages.protocols.viewWeek}
            </button>
            <button
              type="button"
              className={`protocol-tab-btn ${viewMode === 'agenda' ? 'active' : ''}`}
              onClick={() => setViewMode('agenda')}
              role="radio"
              aria-checked={viewMode === 'agenda'}
            >
              {messages.protocols.viewAgenda}
            </button>
          </div>

          <button
            type="button"
            className="protocol-btn protocol-btn-primary"
            onClick={onNewProtocol}
          >
            {messages.protocols.newProtocol}
          </button>
        </div>
      </div>

      <div className="protocol-timezone-notice" role="note">
        {messages.protocols.calendarTimeZoneNotice(calendarTimeZone)}
      </div>

      {protocols.length === 0 ? (
        <div className="protocol-empty-state">
          <p>{messages.protocols.noProtocols}</p>
          <button
            type="button"
            className="protocol-btn protocol-btn-primary"
            onClick={onNewProtocol}
          >
            {messages.protocols.newProtocol}
          </button>
        </div>
      ) : (
        <div className="protocol-calendar-body">
          {viewMode === 'month' && (
            <MonthGrid
              cells={cells}
              occurrencesByDate={occurrencesByDate}
              estimatesByDate={estimatesByDate}
              onEdit={onEditProtocol}
              onMove={onMoveProtocol}
              onDelete={onDeleteProtocol}
              onReschedule={onRescheduleProtocol}
              onCellClick={handleCellClick}
            />
          )}

          {viewMode === 'week' && (
            <WeekStrip
              cells={cells}
              occurrencesByDate={occurrencesByDate}
              estimatesByDate={estimatesByDate}
              onEdit={onEditProtocol}
              onMove={onMoveProtocol}
              onDelete={onDeleteProtocol}
              onReschedule={onRescheduleProtocol}
              onCellClick={handleCellClick}
            />
          )}

          {viewMode === 'agenda' && (
            <AgendaList
              cells={cells}
              occurrencesByDate={occurrencesByDate}
              estimatesByDate={estimatesByDate}
              onEdit={onEditProtocol}
              onMove={onMoveProtocol}
              onDelete={onDeleteProtocol}
              onReschedule={onRescheduleProtocol}
              onCellClick={handleCellClick}
            />
          )}
        </div>
      )}

      {selectedDay && (
        <DaySheet
          isOpen={true}
          date={selectedDay.date}
          occurrences={selectedDay.occurrences}
          estimates={estimatesByDate.get(selectedDay.date) || []}
          onClose={() => setSelectedDay(null)}
          onEdit={onEditProtocol}
          onMove={onMoveProtocol}
          onDelete={onDeleteProtocol}
          onReschedule={onRescheduleProtocol}
        />
      )}
    </div>
  )
}
