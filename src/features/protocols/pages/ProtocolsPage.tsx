import { useEffect, useMemo, useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { SAFETY_LIMITS } from '../../../validation/limits'
import { loadConfigPayload, mutateConfigPayload } from '../../../storage'
import {
  computeCivilDayDelta,
  rescheduleProtocol,
  type UndoMovementState,
} from '../lib/movement'
import { ProtocolDialog } from '../components/ProtocolDialog'
import { DeleteProtocolModal } from '../components/DeleteProtocolModal'
import { KeyboardMove } from '../components/KeyboardMove'
import { UndoBar } from '../components/UndoBar'
import { CalendarPage } from './CalendarPage'
import { ChartsPage } from './ChartsPage'
import type { ConfigPayload, LocalDate, Protocol, TimeZoneId } from '../../../domain/types'
import '../protocols.css'

export function ProtocolsPage() {
  const [config, setConfig] = useState<ConfigPayload | null>(null)
  const [activeTab, setActiveTab] = useState<'calendar' | 'charts'>('calendar')
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false)
  const [editingProtocol, setEditingProtocol] = useState<Protocol | undefined>(undefined)
  const [deletingProtocol, setDeletingProtocol] = useState<Protocol | undefined>(undefined)
  const [movingTarget, setMovingTarget] = useState<{
    protocol: Protocol
    sourceDate: LocalDate
  } | null>(null)
  const [undoState, setUndoState] = useState<UndoMovementState | null>(null)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null,
  )

  useEffect(() => {
    loadConfigPayload().then((payload) => {
      setConfig(payload)
    })
  }, [])

  const calendarTimeZone: TimeZoneId =
    config?.settings.calendarTimeZone ?? 'America/Sao_Paulo'
  const protocols = useMemo<Protocol[]>(() => config?.protocols ?? [], [config])

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type })
    setTimeout(() => {
      setNotice((prev) => (prev?.message === message ? null : prev))
    }, 4000)
  }

  const handleOpenNewProtocol = () => {
    if (protocols.length >= SAFETY_LIMITS.PROTOCOLS_MAX) {
      showNotice(messages.protocols.protocolsMaxReached, 'error')
      return
    }
    setEditingProtocol(undefined)
    setIsProtocolDialogOpen(true)
  }

  const handleOpenEditProtocol = (protocol: Protocol) => {
    setEditingProtocol(protocol)
    setIsProtocolDialogOpen(true)
  }

  const handleSaveProtocol = async (saved: Protocol) => {
    if (!config) return
    try {
      const exists = protocols.some((p) => p.id === saved.id)
      let nextProtocols: Protocol[]

      if (exists) {
        nextProtocols = protocols.map((p) => (p.id === saved.id ? saved : p))
      } else {
        if (protocols.length >= SAFETY_LIMITS.PROTOCOLS_MAX) {
          showNotice(messages.protocols.protocolsMaxReached, 'error')
          return
        }
        nextProtocols = [...protocols, saved]
      }

      await mutateConfigPayload((current) => ({
        ...current,
        protocols: nextProtocols,
      }))

      setConfig((prev) => (prev ? { ...prev, protocols: nextProtocols } : prev))
      setIsProtocolDialogOpen(false)
      setEditingProtocol(undefined)
      showNotice(messages.protocols.saveSuccessNotice)
    } catch {
      showNotice(messages.protocols.saveError, 'error')
    }
  }

  const handleOpenDelete = (protocol: Protocol) => {
    setDeletingProtocol(protocol)
  }

  const handleConfirmDelete = async () => {
    if (!config || !deletingProtocol) return
    try {
      const nextProtocols = protocols.filter((p) => p.id !== deletingProtocol.id)
      await mutateConfigPayload((current) => ({
        ...current,
        protocols: nextProtocols,
      }))

      setConfig((prev) => (prev ? { ...prev, protocols: nextProtocols } : prev))
      setDeletingProtocol(undefined)
      showNotice(messages.protocols.deleteSuccessNotice)
    } catch {
      showNotice(messages.protocols.saveError, 'error')
    }
  }

  const handleOpenMove = (protocol: Protocol, sourceDate: LocalDate) => {
    setMovingTarget({ protocol, sourceDate })
  }

  const handleConfirmKeyboardMove = (protocol: Protocol, targetDate: LocalDate) => {
    if (!movingTarget) return
    const delta = computeCivilDayDelta(movingTarget.sourceDate, targetDate)
    setMovingTarget(null)
    if (delta !== 0) {
      handleReschedule(protocol, delta)
    }
  }

  const handleReschedule = async (protocol: Protocol, deltaDays: number) => {
    if (!config || deltaDays === 0) return
    try {
      const previousSchedule = protocol.schedule
      const updated = rescheduleProtocol(protocol, deltaDays)
      const nextProtocols = protocols.map((p) => (p.id === updated.id ? updated : p))

      await mutateConfigPayload((current) => ({
        ...current,
        protocols: nextProtocols,
      }))

      setConfig((prev) => (prev ? { ...prev, protocols: nextProtocols } : prev))
      setUndoState({
        protocolId: protocol.id,
        protocolName: protocol.name,
        previousSchedule,
        newSchedule: updated.schedule,
      })
      showNotice(messages.protocols.rescheduledNotice(protocol.name))
    } catch {
      showNotice(messages.protocols.saveError, 'error')
    }
  }

  const handleUndo = async () => {
    if (!config || !undoState) return
    try {
      const target = protocols.find((p) => p.id === undoState.protocolId)
      if (!target) {
        setUndoState(null)
        showNotice(messages.protocols.undoError, 'error')
        return
      }

      const reverted: Protocol = {
        ...target,
        schedule: undoState.previousSchedule,
        updatedAt: new Date().toISOString(),
      }
      const nextProtocols = protocols.map((p) => (p.id === reverted.id ? reverted : p))

      await mutateConfigPayload((current) => ({
        ...current,
        protocols: nextProtocols,
      }))

      setConfig((prev) => (prev ? { ...prev, protocols: nextProtocols } : prev))
      setUndoState(null)
      showNotice(messages.protocols.undoSuccessNotice)
    } catch {
      showNotice(messages.protocols.undoError, 'error')
    }
  }

  if (!config) {
    return (
      <section className="page protocols-page" aria-busy="true">
        <p>{messages.protocols.configNotLoaded}</p>
      </section>
    )
  }

  return (
    <section className="page protocols-page">
      <header className="page-header">
        <h1 className="page-title">{messages.protocols.title}</h1>
        <p className="page-description">{messages.pages.protocolos}</p>
      </header>

      {notice && (
        <div
          className={`protocol-notice protocol-notice-${notice.type}`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      )}

      <div className="protocol-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={`protocol-nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          {messages.protocols.tabCalendar}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'charts'}
          className={`protocol-nav-tab ${activeTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          {messages.protocols.tabCharts}
        </button>
      </div>

      <main className="protocol-tab-content" role="tabpanel">
        {activeTab === 'calendar' && (
          <CalendarPage
            protocols={protocols}
            calendarTimeZone={calendarTimeZone}
            onNewProtocol={handleOpenNewProtocol}
            onEditProtocol={handleOpenEditProtocol}
            onMoveProtocol={handleOpenMove}
            onDeleteProtocol={handleOpenDelete}
            onRescheduleProtocol={handleReschedule}
          />
        )}

        {activeTab === 'charts' && (
          <ChartsPage
            protocols={protocols}
            calendarTimeZone={calendarTimeZone}
          />
        )}
      </main>

      {isProtocolDialogOpen && (
        <ProtocolDialog
          key={editingProtocol?.id ?? 'new'}
          isOpen={true}
          initialProtocol={editingProtocol}
          calendarTimeZone={calendarTimeZone}
          onSave={handleSaveProtocol}
          onCancel={() => {
            setIsProtocolDialogOpen(false)
            setEditingProtocol(undefined)
          }}
        />
      )}

      {deletingProtocol && (
        <DeleteProtocolModal
          isOpen={true}
          protocolName={deletingProtocol.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProtocol(undefined)}
        />
      )}

      {movingTarget && (
        <KeyboardMove
          protocol={movingTarget.protocol}
          sourceDate={movingTarget.sourceDate}
          calendarTimeZone={calendarTimeZone}
          onConfirm={handleConfirmKeyboardMove}
          onCancel={() => setMovingTarget(null)}
        />
      )}

      <UndoBar
        undoState={undoState}
        onUndo={handleUndo}
        onDismiss={() => setUndoState(null)}
      />
    </section>
  )
}
