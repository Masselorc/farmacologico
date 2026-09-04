import { useEffect, useState } from 'react'
import { formatDuration, messages } from '../../../app/i18n/pt-BR.messages'
import type { Duration, DurationRange, DurationValue, TimeUnit } from '../../../domain/shared/types.datetime'
import type { PharmacokineticProfile } from '../../../domain/library/types'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import { parseLocaleDecimal } from '../../../domain/units/decimal'
import { type LibraryItemView, profileViewIdentity } from '../lib/view'
import {
  createComparatorIntent,
  createProtocolIntent,
  type LibraryComparatorIntent,
  type LibraryProtocolIntent,
} from '../lib/intents'
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
  const currentProfileView = item.profileViews?.[selectedProfileIndex]
  const currentProfile: PharmacokineticProfile | undefined = currentProfileView?.profile
  const profileIdentity = currentProfileView ? profileViewIdentity(currentProfileView) : ''

  const [chosenHalfLife, setChosenHalfLife] = useState<DurationValue | undefined>(undefined)
  const [chosenTmax, setChosenTmax] = useState<'instant' | DurationValue | undefined>(undefined)

  // Controle para Tmax unknown
  const [tmaxUnknownMode, setTmaxUnknownMode] = useState<'none' | 'value' | 'instant'>('none')
  const [tmaxUnknownText, setTmaxUnknownText] = useState('')
  const [tmaxUnknownUnit, setTmaxUnknownUnit] = useState<TimeUnit>('hours')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [preparedIntent, setPreparedIntent] = useState<
    LibraryComparatorIntent | LibraryProtocolIntent | null
  >(null)

  // Origem dinâmica: acompanha o perfil selecionado
  const displayedOrigin = isBlend
    ? item.origin
    : currentProfile
      ? currentProfile.origin
      : item.origin

  // Fecha no ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleCreateComparator() {
    if (isBlend || item.substance.kind !== 'single' || !currentProfile || !currentProfileView) return

    setErrorMessage(null)
    try {
      const intent = createComparatorIntent({
        substance: item.substance,
        substanceProvenance: item.substanceProvenance,
        selectedProfile: currentProfileView,
        parameterSelection: {
          chosenHalfLife,
          chosenTmax,
        },
      })
      setPreparedIntent(intent)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Seleção incompleta')) {
        setErrorMessage(messages.library.selectionRequiredAlert)
      } else {
        setErrorMessage(messages.library.actionError)
      }
    }
  }

  function handleCreateProtocol() {
    setErrorMessage(null)
    try {
      if (isBlend) {
        if (item.substance.kind !== 'blend') return
        const intent = createProtocolIntent({
          substance: item.substance,
          dataset: OFFICIAL_DATASET_V1,
        })
        setPreparedIntent(intent)
      } else {
        if (item.substance.kind !== 'single' || !currentProfile || !currentProfileView) return
        const intent = createProtocolIntent({
          substance: item.substance,
          substanceProvenance: item.substanceProvenance,
          selectedProfile: currentProfileView,
          parameterSelection: {
            chosenHalfLife,
            chosenTmax,
          },
        })
        setPreparedIntent(intent)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Seleção incompleta')) {
        setErrorMessage(messages.library.selectionRequiredAlert)
      } else {
        setErrorMessage(messages.library.actionError)
      }
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
              <OriginBadge origin={displayedOrigin} />
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
          {!isBlend && item.profileViews.length > 1 && (
            <div className="sheet-profiles-selector">
              <label htmlFor="sheet-profile-select" className="sheet-field-label">
                {messages.library.profilesCount(item.profileViews.length)}:
              </label>
              <select
                id="sheet-profile-select"
                className="sheet-select"
                value={selectedProfileIndex}
                onChange={(e) => {
                  setSelectedProfileIndex(Number(e.target.value))
                  setChosenHalfLife(undefined)
                  setChosenTmax(undefined)
                  setTmaxUnknownMode('none')
                  setTmaxUnknownText('')
                  setPreparedIntent(null)
                  setErrorMessage(null)
                }}
              >
                {item.profileViews.map((profileView, idx) => (
                  <option key={profileViewIdentity(profileView)} value={idx}>
                    {profileView.profile.id}{' '}
                    {profileView.profile.formulation ? `(${profileView.profile.formulation})` : ''}{' '}
                    {profileView.profile.ester ? `[${profileView.profile.ester}]` : ''}
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
                        {messages.library.proportionLabel((c.proportion * 100).toFixed(0), c.proportion)}
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
                      ? messages.library.rangeMinMax(
                          formatDuration(currentProfile.halfLife.min),
                          formatDuration(currentProfile.halfLife.max),
                        )
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
                          ? messages.library.rangeMinMax(
                              formatDuration(currentProfile.tmaxSpec.range.min),
                              formatDuration(currentProfile.tmaxSpec.range.max),
                            )
                          : messages.library.unspecified}
                  </span>
                </div>
              </div>

              {/* Seletor de faixas para Meia-vida */}
              {isDurationRange(currentProfile.halfLife) && (
                <div className="sheet-range-group">
                  <RangeSelector
                    key={`half-life:${profileIdentity}`}
                    label={messages.library.selectHalfLifeFromRange}
                    range={currentProfile.halfLife}
                    value={chosenHalfLife}
                    onChange={(val) => {
                      setChosenHalfLife(val)
                      setPreparedIntent(null)
                      setErrorMessage(null)
                    }}
                  />
                </div>
              )}

              {/* Seletor de faixas para Tmax */}
              {currentProfile.tmaxSpec.kind === 'range' && (
                <div className="sheet-range-group">
                  <RangeSelector
                    key={`tmax:${profileIdentity}`}
                    label={messages.library.selectTmaxFromRange}
                    range={currentProfile.tmaxSpec.range}
                    value={typeof chosenTmax === 'object' ? chosenTmax : undefined}
                    onChange={(val) => {
                      setChosenTmax(val)
                      setPreparedIntent(null)
                      setErrorMessage(null)
                    }}
                  />
                </div>
              )}

              {/* Controles para Tmax unknown */}
              {currentProfile.tmaxSpec.kind === 'unknown' && (
                <div className="sheet-range-group">
                  <label className="sheet-field-label">{messages.library.tmaxUnknownOptionTitle}</label>
                  <div className="unknown-tmax-options-row">
                    <label className="unknown-tmax-radio-label">
                      <input
                        type="radio"
                        name="tmax-unknown-selection"
                        checked={tmaxUnknownMode === 'value'}
                        onChange={() => {
                          setTmaxUnknownMode('value')
                          setPreparedIntent(null)
                          setErrorMessage(null)
                          const res = parseLocaleDecimal(tmaxUnknownText)
                          if (res.ok && res.value > 0) {
                            setChosenTmax({ value: res.value, unit: tmaxUnknownUnit })
                          } else {
                            setChosenTmax(undefined)
                          }
                        }}
                      />
                      {messages.library.tmaxUnknownProvideValue}
                    </label>
                    <label className="unknown-tmax-radio-label">
                      <input
                        type="radio"
                        name="tmax-unknown-selection"
                        checked={tmaxUnknownMode === 'instant'}
                        onChange={() => {
                          setTmaxUnknownMode('instant')
                          setPreparedIntent(null)
                          setErrorMessage(null)
                          setChosenTmax('instant')
                        }}
                      />
                      {messages.library.tmaxUnknownInstantOption}
                    </label>
                  </div>
                  {tmaxUnknownMode === 'value' && (
                    <div className="range-inputs-row unknown-tmax-inputs">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="range-input"
                        placeholder={messages.library.enterValue}
                        value={tmaxUnknownText}
                        onChange={(e) => {
                          setTmaxUnknownText(e.target.value)
                          setPreparedIntent(null)
                          setErrorMessage(null)
                          const res = parseLocaleDecimal(e.target.value)
                          if (res.ok && Number.isFinite(res.value) && res.value > 0) {
                            setChosenTmax({ value: res.value, unit: tmaxUnknownUnit })
                          } else {
                            setChosenTmax(undefined)
                          }
                        }}
                        aria-label={messages.library.tmaxUnknownValueLabel}
                      />
                      <select
                        className="range-unit-select"
                        value={tmaxUnknownUnit}
                        onChange={(e) => {
                          const nextUnit = e.target.value as TimeUnit
                          setTmaxUnknownUnit(nextUnit)
                          setPreparedIntent(null)
                          setErrorMessage(null)
                          const res = parseLocaleDecimal(tmaxUnknownText)
                          if (res.ok && Number.isFinite(res.value) && res.value > 0) {
                            setChosenTmax({ value: res.value, unit: nextUnit })
                          } else {
                            setChosenTmax(undefined)
                          }
                        }}
                      >
                        <option value="minutes">{messages.comparator.timeUnitMinutes}</option>
                        <option value="hours">{messages.comparator.timeUnitHours}</option>
                        <option value="days">{messages.comparator.timeUnitDays}</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Biodisponibilidade de referência quando presente */}
              {currentProfile.bioavailability !== undefined && (
                <div className="sheet-field bioavailability-field">
                  <span className="sheet-field-label">
                    {typeof currentProfile.bioavailability === 'number'
                      ? messages.library.bioavailabilityReference(
                          `${(currentProfile.bioavailability * 100).toFixed(0)}%`,
                        )
                      : messages.library.bioavailabilityRange(
                          `${(currentProfile.bioavailability.min * 100).toFixed(0)}%`,
                          `${(currentProfile.bioavailability.max * 100).toFixed(0)}%`,
                        )}
                  </span>
                </div>
              )}

              {/* Aviso educacional de biodisponibilidade */}
              <p className="bioavailability-note">{messages.library.bioavailabilityDisclaimer}</p>
            </div>
          ) : (
            <p id="sheet-no-profile-message" className="sheet-no-profile-message" role="status">
              {messages.library.profileRequiredForAction}
            </p>
          )}

          {/* Banner de erro acessível inline */}
          {errorMessage && (
            <div className="sheet-error-banner" role="alert">
              {errorMessage}
            </div>
          )}

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
                  disabled={!currentProfile}
                  aria-describedby={!currentProfile ? 'sheet-no-profile-message' : undefined}
                >
                  {messages.library.compare}
                </button>
                <button
                  type="button"
                  className="btn-primary cta-button"
                  onClick={handleCreateProtocol}
                  disabled={!currentProfile}
                  aria-describedby={!currentProfile ? 'sheet-no-profile-message' : undefined}
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
