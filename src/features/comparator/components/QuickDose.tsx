import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../../app/i18n/pt-BR.messages'
import type { LocalDate, LocalTime, TimeZoneId } from '../../../domain/types'

export interface QuickDoseProps {
  calendarTimeZone: TimeZoneId
  onSelectCurrentDateTime: (params: { localDate: LocalDate; localTime: LocalTime }) => void
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function QuickDose({
  calendarTimeZone,
  onSelectCurrentDateTime,
}: QuickDoseProps) {
  const handleClick = () => {
    try {
      const nowInstant = Temporal.Now.instant()
      const zoned = nowInstant.toZonedDateTimeISO(calendarTimeZone)
      const date = zoned.toPlainDate().toString() as LocalDate
      const time = `${pad2(zoned.hour)}:${pad2(zoned.minute)}` as LocalTime
      onSelectCurrentDateTime({ localDate: date, localTime: time })
    } catch {
      // fallback
    }
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline quick-dose-btn"
      onClick={handleClick}
    >
      🕒 {messages.comparator.useCurrentTime}
    </button>
  )
}
