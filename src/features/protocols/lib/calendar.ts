import { Temporal } from '@js-temporal/polyfill'
import { civilToInstantIso, instantToZonedParts } from '../../../domain/shared/datetime'
import { generateOccurrences } from '../../../domain/recurrence/generate'
import type { DisplayWindow, LocalDate, LocalTime, Protocol, TimeZoneId } from '../../../domain/types'

export type CalendarViewMode = 'month' | 'week' | 'agenda'

export interface CalendarOccurrence {
  protocol: Protocol
  instantMs: number
  localDate: LocalDate
  localTime: LocalTime
}

export interface CalendarCell {
  localDate: LocalDate
  isCurrentMonth: boolean
  isToday: boolean
  dayOfMonth: number
  dayOfWeek: number // ISO 1 (Monday) .. 7 (Sunday)
  startMs: number
  endMs: number
}

function civilDateToStartMs(date: Temporal.PlainDate, timeZone: TimeZoneId): number {
  const iso = civilToInstantIso({
    localDate: date.toString(),
    localTime: '00:00',
    timeZone,
  })
  return Temporal.Instant.from(iso).epochMilliseconds
}

export function todayLocalDate(calendarTimeZone: TimeZoneId): LocalDate {
  return Temporal.Now.zonedDateTimeISO(calendarTimeZone).toPlainDate().toString()
}

export function occurrenceToZonedPlacement(
  instantMs: number,
  calendarTimeZone: TimeZoneId,
): { localDate: LocalDate; localTime: LocalTime } {
  const instantIso = Temporal.Instant.fromEpochMilliseconds(instantMs).toString()
  const parts = instantToZonedParts({ instantIso, timeZone: calendarTimeZone })
  return {
    localDate: parts.localDate,
    localTime: parts.localTime,
  }
}

export function deriveViewDisplayWindow(
  viewMode: CalendarViewMode,
  anchorDateStr: LocalDate,
  calendarTimeZone: TimeZoneId,
): DisplayWindow {
  const anchor = Temporal.PlainDate.from(anchorDateStr)

  if (viewMode === 'month') {
    const firstDate = anchor.with({ day: 1 })
    const startMonday = firstDate.subtract({ days: firstDate.dayOfWeek - 1 })
    const lastDate = firstDate.add({ months: 1 }).subtract({ days: 1 })
    const endSunday = lastDate.add({ days: (7 - lastDate.dayOfWeek) % 7 })
    const endExclusive = endSunday.add({ days: 1 })

    return {
      startMs: civilDateToStartMs(startMonday, calendarTimeZone),
      endMs: civilDateToStartMs(endExclusive, calendarTimeZone),
    }
  }

  if (viewMode === 'week') {
    const monday = anchor.subtract({ days: anchor.dayOfWeek - 1 })
    const nextMonday = monday.add({ days: 7 })

    return {
      startMs: civilDateToStartMs(monday, calendarTimeZone),
      endMs: civilDateToStartMs(nextMonday, calendarTimeZone),
    }
  }

  // Agenda: 30 dias a partir da data de âncora
  const endExclusive = anchor.add({ days: 30 })
  return {
    startMs: civilDateToStartMs(anchor, calendarTimeZone),
    endMs: civilDateToStartMs(endExclusive, calendarTimeZone),
  }
}

export function buildMonthCells(
  anchorDateStr: LocalDate,
  calendarTimeZone: TimeZoneId,
  todayStr?: LocalDate,
): CalendarCell[] {
  const anchor = Temporal.PlainDate.from(anchorDateStr)
  const currentMonth = anchor.month
  const today = todayStr ?? todayLocalDate(calendarTimeZone)

  const firstDate = anchor.with({ day: 1 })
  const startMonday = firstDate.subtract({ days: firstDate.dayOfWeek - 1 })
  const lastDate = firstDate.add({ months: 1 }).subtract({ days: 1 })
  const endSunday = lastDate.add({ days: (7 - lastDate.dayOfWeek) % 7 })

  const cells: CalendarCell[] = []
  let curr = startMonday

  while (Temporal.PlainDate.compare(curr, endSunday) <= 0) {
    const next = curr.add({ days: 1 })
    const dateStr = curr.toString()

    cells.push({
      localDate: dateStr,
      isCurrentMonth: curr.month === currentMonth,
      isToday: dateStr === today,
      dayOfMonth: curr.day,
      dayOfWeek: curr.dayOfWeek,
      startMs: civilDateToStartMs(curr, calendarTimeZone),
      endMs: civilDateToStartMs(next, calendarTimeZone),
    })

    curr = next
  }

  return cells
}

export function buildWeekCells(
  anchorDateStr: LocalDate,
  calendarTimeZone: TimeZoneId,
  todayStr?: LocalDate,
): CalendarCell[] {
  const anchor = Temporal.PlainDate.from(anchorDateStr)
  const today = todayStr ?? todayLocalDate(calendarTimeZone)
  const monday = anchor.subtract({ days: anchor.dayOfWeek - 1 })

  const cells: CalendarCell[] = []
  for (let i = 0; i < 7; i++) {
    const curr = monday.add({ days: i })
    const next = curr.add({ days: 1 })
    const dateStr = curr.toString()

    cells.push({
      localDate: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === today,
      dayOfMonth: curr.day,
      dayOfWeek: curr.dayOfWeek,
      startMs: civilDateToStartMs(curr, calendarTimeZone),
      endMs: civilDateToStartMs(next, calendarTimeZone),
    })
  }

  return cells
}

export function buildAgendaDays(
  anchorDateStr: LocalDate,
  daysCount = 30,
  calendarTimeZone: TimeZoneId,
  todayStr?: LocalDate,
): CalendarCell[] {
  const anchor = Temporal.PlainDate.from(anchorDateStr)
  const today = todayStr ?? todayLocalDate(calendarTimeZone)

  const cells: CalendarCell[] = []
  for (let i = 0; i < daysCount; i++) {
    const curr = anchor.add({ days: i })
    const next = curr.add({ days: 1 })
    const dateStr = curr.toString()

    cells.push({
      localDate: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === today,
      dayOfMonth: curr.day,
      dayOfWeek: curr.dayOfWeek,
      startMs: civilDateToStartMs(curr, calendarTimeZone),
      endMs: civilDateToStartMs(next, calendarTimeZone),
    })
  }

  return cells
}

export function navigatePeriod(
  currentAnchorStr: LocalDate,
  mode: CalendarViewMode,
  direction: -1 | 1,
): LocalDate {
  const anchor = Temporal.PlainDate.from(currentAnchorStr)

  if (mode === 'month') {
    return anchor.add({ months: direction }).toString()
  }
  if (mode === 'week') {
    return anchor.add({ weeks: direction }).toString()
  }
  return anchor.add({ days: direction * 14 }).toString()
}

export function collectWindowOccurrences(
  protocols: ReadonlyArray<Protocol>,
  window: DisplayWindow,
  calendarTimeZone: TimeZoneId,
): CalendarOccurrence[] {
  const list: CalendarOccurrence[] = []
  for (const protocol of protocols) {
    let occurrences
    try {
      occurrences = generateOccurrences(
        protocol.schedule,
        window.startMs,
        window.endMs,
      )
    } catch {
      continue
    }

    for (const occ of occurrences) {
      const placement = occurrenceToZonedPlacement(occ.instantMs, calendarTimeZone)
      list.push({
        protocol,
        instantMs: occ.instantMs,
        localDate: placement.localDate,
        localTime: placement.localTime,
      })
    }
  }

  list.sort((a, b) => {
    if (a.instantMs !== b.instantMs) return a.instantMs - b.instantMs
    return a.protocol.name.localeCompare(b.protocol.name)
  })

  return list
}

