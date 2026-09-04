import { useRef, useState } from 'react'
import { formatPresentationNumber } from '../../comparator/lib/presentation'
import { sanitizePaletteColor } from '../../../domain/shared/colors'
import {
  CLICK_SUPPRESSION_MS,
  computeCivilDayDelta,
  DRAG_THRESHOLD_PX,
} from '../lib/movement'
import { QuickMenu } from './QuickMenu'
import type { LocalDate, LocalTime, Protocol } from '../../../domain/types'

export interface AdminCardProps {
  protocol: Protocol
  sourceDate: LocalDate
  localTime: LocalTime
  onEdit: (protocol: Protocol) => void
  onMove: (protocol: Protocol, sourceDate: LocalDate) => void
  onDelete: (protocol: Protocol) => void
  onReschedule: (protocol: Protocol, deltaDays: number) => void
  onCardClick?: () => void
}

export function AdminCard({
  protocol,
  sourceDate,
  localTime,
  onEdit,
  onMove,
  onDelete,
  onReschedule,
  onCardClick,
}: AdminCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const clickSuppressedUntilRef = useRef<number>(0)
  const activePointerIdRef = useRef<number | null>(null)

  const primaryColor = sanitizePaletteColor(
    protocol.components[0]?.displayColor?.paletteColor,
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Se o clique foi no menu de ações, não iniciar drag
    if ((e.target as HTMLElement).closest('.protocol-quick-menu-container')) {
      return
    }

    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    activePointerIdRef.current = e.pointerId

    let hasDraggedBeyondThreshold = false

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!pointerDownPos.current) return

      const dx = moveEv.clientX - pointerDownPos.current.x
      const dy = moveEv.clientY - pointerDownPos.current.y
      const dist = Math.hypot(dx, dy)

      if (!hasDraggedBeyondThreshold && dist >= DRAG_THRESHOLD_PX) {
        hasDraggedBeyondThreshold = true
        setIsDragging(true)
      }

      if (hasDraggedBeyondThreshold) {
        // Remove highlight anterior
        document
          .querySelectorAll('.protocol-calendar-cell[data-drag-over="true"]')
          .forEach((el) => el.removeAttribute('data-drag-over'))

        // Identifica célula sob o ponteiro
        const targetEl = document.elementFromPoint(moveEv.clientX, moveEv.clientY)
        const cell = targetEl?.closest<HTMLElement>('.protocol-calendar-cell[data-drop-date]')
        if (cell) {
          cell.setAttribute('data-drag-over', 'true')
        }
      }
    }

    const cleanupDrag = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      pointerDownPos.current = null
      activePointerIdRef.current = null
      setIsDragging(false)
      document
        .querySelectorAll('.protocol-calendar-cell[data-drag-over="true"]')
        .forEach((el) => el.removeAttribute('data-drag-over'))
    }

    const handlePointerUp = (upEv: PointerEvent) => {
      if (hasDraggedBeyondThreshold) {
        clickSuppressedUntilRef.current = Date.now() + CLICK_SUPPRESSION_MS

        const targetEl = document.elementFromPoint(upEv.clientX, upEv.clientY)
        const cell = targetEl?.closest<HTMLElement>('.protocol-calendar-cell[data-drop-date]')
        const dropDate = cell?.getAttribute('data-drop-date') as LocalDate | undefined

        if (dropDate && dropDate !== sourceDate) {
          const delta = computeCivilDayDelta(sourceDate, dropDate)
          if (delta !== 0) {
            onReschedule(protocol, delta)
          }
        }
      }
      cleanupDrag()
    }

    const handlePointerCancel = () => {
      cleanupDrag()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (Date.now() < clickSuppressedUntilRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onCardClick?.()
  }

  const formattedDose = formatPresentationNumber(protocol.totalDoseMg, 2)
  const isBlend = protocol.components.length > 1

  return (
    <div
      className="protocol-admin-card"
      data-color={primaryColor}
      data-dragging={isDragging ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${protocol.name} às ${localTime}, ${formattedDose} mg`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCardClick?.()
        }
      }}
    >
      <div className="protocol-admin-card-header">
        <span className="card-indicator" aria-hidden="true" />
        <span className="card-name" title={protocol.name}>
          {protocol.name}
        </span>
        <QuickMenu
          protocolName={protocol.name}
          onEdit={() => onEdit(protocol)}
          onMove={() => onMove(protocol, sourceDate)}
          onDelete={() => onDelete(protocol)}
        />
      </div>

      <div className="protocol-admin-card-body">
        <span className="card-time">{localTime}</span>
        <span className="card-dose">{`${formattedDose} mg`}</span>
        {isBlend && (
          <span
            className="card-blend-badge"
            title={protocol.components.map((c) => `${c.label} (${c.proportion})`).join(', ')}
          >
            Blend
          </span>
        )}
      </div>
    </div>
  )
}
