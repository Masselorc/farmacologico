import { useEffect, useMemo, useState } from 'react'
import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { civilToInstantIso } from '../../../domain/shared/datetime'
import { KineticChart } from '../../charts/KineticChart'
import { RangeControls, type ChartDisplayMode } from '../components/RangeControls'
import { analyzeProtocolsLive } from '../lib/analysis'
import { todayLocalDate } from '../lib/calendar'
import type { DisplayWindow, LocalDate, Protocol, TimeZoneId } from '../../../domain/types'

export interface ChartsPageProps {
  protocols: ReadonlyArray<Protocol>
  calendarTimeZone: TimeZoneId
}

export function ChartsPage({ protocols, calendarTimeZone }: ChartsPageProps) {
  const today = useMemo(() => todayLocalDate(calendarTimeZone), [calendarTimeZone])

  const [startDate, setStartDate] = useState<LocalDate>(() => {
    const plain = Temporal.PlainDate.from(today)
    return plain.subtract({ days: 7 }).toString() as LocalDate
  })

  const [endDate, setEndDate] = useState<LocalDate>(() => {
    const plain = Temporal.PlainDate.from(today)
    return plain.add({ days: 30 }).toString() as LocalDate
  })

  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>('combined')
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(() => new Set())

  // Relógio vivo de 1 segundo para atualização de nowMs (§76)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const handleToggleProtocol = (id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setDeselectedIds(new Set())
  }

  const selectedProtocols = useMemo(
    () => protocols.filter((p) => !deselectedIds.has(p.id)),
    [protocols, deselectedIds],
  )

  const selectedProtocolIds = useMemo(
    () => new Set(selectedProtocols.map((p) => p.id)),
    [selectedProtocols],
  )

  const displayWindow = useMemo<DisplayWindow>(() => {
    try {
      const startIso = civilToInstantIso({
        localDate: startDate,
        localTime: '00:00',
        timeZone: calendarTimeZone,
      })
      const endIso = civilToInstantIso({
        localDate: endDate,
        localTime: '23:59',
        timeZone: calendarTimeZone,
      })
      const startMs = Temporal.Instant.from(startIso).epochMilliseconds
      const endMs = Temporal.Instant.from(endIso).epochMilliseconds

      if (startMs >= endMs) {
        // Fallback defensivo em caso de intervalo inválido
        return { startMs, endMs: startMs + 86400000 * 37 }
      }

      return { startMs, endMs }
    } catch {
      return { startMs: nowMs - 86400000 * 7, endMs: nowMs + 86400000 * 30 }
    }
  }, [startDate, endDate, calendarTimeZone, nowMs])

  const analysis = useMemo(
    () => analyzeProtocolsLive(selectedProtocols, displayWindow, nowMs),
    [selectedProtocols, displayWindow, nowMs],
  )

  return (
    <div className="protocol-charts-page">
      <RangeControls
        startDate={startDate}
        endDate={endDate}
        displayMode={displayMode}
        protocols={protocols}
        selectedProtocolIds={selectedProtocolIds}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onDisplayModeChange={setDisplayMode}
        onToggleProtocol={handleToggleProtocol}
        onSelectAllProtocols={handleSelectAll}
      />

      <div className="protocol-charts-body">
        {selectedProtocols.length === 0 ? (
          <div className="protocol-empty-state" role="status">
            <p>{messages.protocols.noSeriesSelected}</p>
          </div>
        ) : displayMode === 'combined' ? (
          <KineticChart
            series={analysis.series}
            temporalGuides={analysis.temporalGuides}
            calendarTimeZone={calendarTimeZone}
            chartTitle={messages.protocols.chartCombined}
          />
        ) : (
          <div className="protocol-individual-charts-list">
            {selectedProtocols.map((proto) => {
              const protoSeries = analysis.series.filter(
                (s) => s.protocolId === proto.id,
              )
              const protoGuides = analysis.temporalGuides.filter(
                (g) => g.protocolId === proto.id,
              )

              return (
                <div key={proto.id} className="protocol-individual-chart-item">
                  <KineticChart
                    series={protoSeries}
                    temporalGuides={protoGuides}
                    calendarTimeZone={calendarTimeZone}
                    chartTitle={proto.name}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
