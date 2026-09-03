import { useEffect, useState } from 'react'
import { formatDuration, messages } from '../../../app/i18n/pt-BR.messages'
import type { Duration, DurationRange, DurationValue } from '../../../domain/shared/types.datetime'
import type { PharmacokineticProfile } from '../../../domain/library/types'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import type { LibraryItemView } from '../lib/view'
import {
  createComparatorIntent,
  createProtocolIntent,
  type LibraryComparatorIntent,
  type LibraryProtocolIntent,
} from '../lib/intents'
import { resolveProfileParameters } from '../lib/selection'
import { OriginBadge } from './OriginBadge'
import { RangeSelector } from './RangeSelector'

function isDurationRange(d: Duration): d is DurationRange {
  return 'min' in d
}

export interface SubstanceSheetProps {
  item: LibraryItemView
  onClose: () => void
}

export function SubstanceSheet({ item, onClose }: SubstanceSheetProps) {
  const isBlend = item.kind === 'blend'
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0)
  const currentProfile: PharmacokineticProfile | undefined = item.profiles[selectedProfileIndex]

  const [chosenHalfLife, setChosenHalfLife] = useState<DurationValue | undefined>(undefined)
  const [chosenTmax, setChosenTmax] = useState<'instant' | DurationValue | undefined>(undefined)

  const [preparedIntent, setPreparedIntent] = useState<
    LibraryComparatorIntent | LibraryProtocolIntent | null
  >(null)

  // Fecha no ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleCreateComparator() {
    if (isBlend) return
    if (!currentProfile) return

    try {
      const resolved = resolveProfileParameters(currentProfile, {
        chosenHalfLife,
        chosenTmax,
      })

      if (resolved.needsUserSelection) {
        alert('Selecione os parâmetros obrigatórios antes de prosseguir.')
        return
      }

      const intent = createComparatorIntent({
        substance: item.substance,
        profile: currentProfile,
        selection: {
          halfLifeMs: resolved.selectedPkParameters.halfLifeMs,
          tmaxMs: resolved.selectedPkParameters.tmaxMs,
          snapshot: resolved.pkParametersSnapshot,
        },
      })
      setPreparedIntent(intent)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  function handleCreateProtocol() {
    try {
      if (isBlend) {
        const intent = createProtocolIntent({
          substance: item.substance,
          dataset: OFFICIAL_DATASET_V1,
        })
        setPreparedIntent(intent)
      } else {
        if (!currentProfile) return
        const resolved = resolveProfileParameters(currentProfile, {
          chosenHalfLife,
          chosenTmax,
        })
        if (resolved.needsUserSelection) {
          alert('Selecione os parâmetros obrigatórios antes de prosseguir.')
          return
        }

        const intent = createProtocolIntent({
          substance: item.substance,
          profile: currentProfile,
          selection: {
            halfLifeMs: resolved.selectedPkParameters.halfLifeMs,
            tmaxMs: resolved.selectedPkParameters.tmaxMs,
            snapshot: resolved.pkParametersSnapshot,
          },
        })
        setPreparedIntent(intent)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <div className="sheet-title-group">
            <h2 id="sheet-title" className="sheet-title">
              {item.name}
            </h2>
            <div className="sheet-badges">
              <span className={`kind-badge ${isBlend ? 'kind-badge-blend' : 'kind-badge-single'}`}>
                {isBlend ? messages.library.blendKind : messages.library.singleKind}
              </span>
              <OriginBadge origin={item.origin} />
            </div>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label={messages.library.closeSheet}
          >
            ✕
          </button>
        </div>

        <div className="sheet-body">
          {/* Seletor de perfis se houver mais de um */}
          {!isBlend && item.profiles.length > 1 && (
            <div className="sheet-profiles-selector">
              <label className="sheet-field-label">{messages.library.profilesCount(item.profiles.length)}:</label>
              <select
                className="sheet-select"
                value={selectedProfileIndex}
                onChange={(e) => {
                  setSelectedProfileIndex(Number(e.target.value))
                  setChosenHalfLife(undefined)
                  setChosenTmax(undefined)
                  setPreparedIntent(null)
                }}
              >
                {item.profiles.map((p, idx) => (
                  <option key={p.id} value={idx}>
                    {p.id} {p.formulation ? `(${p.formulation})` : ''} {p.ester ? `[${p.ester}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isBlend ? (
            <div className="sheet-blend-details">
              <h3 className="sheet-section-title">{messages.library.componentsTitle}</h3>
              <ul className="blend-components-list">
                {item.substance.kind === 'blend' &&
                  item.substance.components.map((c) => (
                    <li key={c.substanceId} className="blend-component-item">
                      <span className="component-color" data-color={c.displayColor?.paletteColor} />
                      <span className="component-name">{c.substanceId}</span>
                      <span className="component-prop">
                        Proporção: {(c.proportion * 100).toFixed(0)}% ({c.proportion})
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : currentProfile ? (
            <div className="sheet-single-details">
              <div className="sheet-grid-fields">
                <div className="sheet-field">
                  <span className="sheet-field-label">{messages.library.routeLabel}</span>
                  <span className="sheet-field-value">{currentProfile.route}</span>
                </div>
                {currentProfile.ester && (
                  <div className="sheet-field">
                    <span className="sheet-field-label">{messages.library.esterLabel}</span>
                    <span className="sheet-field-value">{currentProfile.ester}</span>
                  </div>
                )}
                {currentProfile.formulation && (
                  <div className="sheet-field">
                    <span className="sheet-field-label">{messages.library.formulationLabel}</span>
                    <span className="sheet-field-value">{currentProfile.formulation}</span>
                  </div>
                )}
                <div className="sheet-field">
                  <span className="sheet-field-label">{messages.library.halfLifeLabel}</span>
                  <span className="sheet-field-value">
                    {isDurationRange(currentProfile.halfLife)
                      ? `Faixa de ${formatDuration(currentProfile.halfLife.min)} a ${formatDuration(currentProfile.halfLife.max)}`
                      : formatDuration(currentProfile.halfLife)}
                  </span>
                </div>
                <div className="sheet-field">
                  <span className="sheet-field-label">{messages.library.tmaxLabel}</span>
                  <span className="sheet-field-value">
                    {currentProfile.tmaxSpec.kind === 'value'
                      ? formatDuration(currentProfile.tmaxSpec.value)
                      : currentProfile.tmaxSpec.kind === 'instant'
                        ? messages.library.tmaxInstant
                        : currentProfile.tmaxSpec.kind === 'range'
                          ? `Faixa de ${formatDuration(currentProfile.tmaxSpec.range.min)} a ${formatDuration(currentProfile.tmaxSpec.range.max)}`
                          : 'Não especificado'}
                  </span>
                </div>
              </div>

              {/* Seletor de faixas quando necessário */}
              {isDurationRange(currentProfile.halfLife) && (
                <div className="sheet-range-group">
                  <RangeSelector
                    label="Selecionar Meia-vida da faixa"
                    range={currentProfile.halfLife}
                    value={chosenHalfLife}
                    onChange={setChosenHalfLife}
                  />
                </div>
              )}

              {currentProfile.tmaxSpec.kind === 'range' && (
                <div className="sheet-range-group">
                  <RangeSelector
                    label="Selecionar Tmax da faixa"
                    range={currentProfile.tmaxSpec.range}
                    value={typeof chosenTmax === 'object' ? chosenTmax : undefined}
                    onChange={setChosenTmax}
                  />
                </div>
              )}

              {/* Aviso educacional de biodisponibilidade */}
              <p className="bioavailability-note">{messages.library.bioavailabilityDisclaimer}</p>
            </div>
          ) : null}

          {/* Seção de CTAs */}
          <div className="sheet-actions">
            {isBlend ? (
              <div className="blend-cta-container">
                <p className="blend-unavailable-message">
                  {messages.library.blendComparatorUnavailable}
                </p>
                <button
                  type="button"
                  className="btn-primary cta-button"
                  onClick={handleCreateProtocol}
                >
                  {messages.library.addToProtocols}
                </button>
              </div>
            ) : (
              <div className="single-cta-container">
                <button
                  type="button"
                  className="btn-secondary cta-button"
                  onClick={handleCreateComparator}
                >
                  {messages.library.compare}
                </button>
                <button
                  type="button"
                  className="btn-primary cta-button"
                  onClick={handleCreateProtocol}
                >
                  {messages.library.addToProtocols}
                </button>
              </div>
            )}
          </div>

          {/* Preview transitório do intent preparado em memória */}
          {preparedIntent && (
            <div className="intent-preview-box">
              <h4 className="intent-preview-title">{messages.library.intentPreviewTitle}</h4>
              <pre className="intent-preview-json">{JSON.stringify(preparedIntent, null, 2)}</pre>
              <p className="intent-preview-notice">{messages.library.intentPreviewNotice}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
