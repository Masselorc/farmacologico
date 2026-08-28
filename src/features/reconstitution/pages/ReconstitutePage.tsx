import { useMemo, useState, type ChangeEvent } from 'react'
import {
  formatDataManagementError,
  formatDomainError,
  messages,
} from '../../../app/i18n/pt-BR.messages'
import { calculateReconstitution } from '../../../domain/reconstitution/calculate'
import type { ReconstitutionResult } from '../../../domain/types'
import type { DomainError, StorageOperationError } from '../../../domain/shared/errors'
import { addCalculationRecord, getPersistenceConsent, getStorageMode } from '../../../storage'
import { UX_LIMITS } from '../../../validation/limits'
import {
  CAPACITY_OPTIONS,
  INITIAL_RECONSTITUTION_DRAFT,
  parseReconstitutionDraft,
  type ReconstitutionDraft,
  type ReconstitutionDraftField,
} from '../lib/form'
import { createReconstitutionCalculationRecord } from '../lib/historyRecord'
import { buildReconstitutionCopyText } from '../lib/presentation'
import { CopyButton } from '../components/CopyButton'
import { ResultPanel } from '../components/ResultPanel'
import { SaveToHistoryButton } from '../components/SaveToHistoryButton'
import '../reconstitution.css'

interface Computation {
  input: NonNullable<ReturnType<typeof parseReconstitutionDraft>['input']>
  result?: ReconstitutionResult
  errors: DomainError[]
}

type SaveStatus =
  | { kind: 'idle'; message: '' }
  | { kind: 'saving'; message: string }
  | { kind: 'success' | 'failure'; message: string }

interface TextFieldProps {
  id: string
  field: ReconstitutionDraftField
  label: string
  unit?: string
  helper: string
  value: string
  error?: string
  touched: boolean
  maxLength?: number
  onChange: (value: string) => void
  onBlur: () => void
}

function TextField({
  id,
  field,
  label,
  unit,
  helper,
  value,
  error,
  touched,
  maxLength,
  onChange,
  onBlur,
}: TextFieldProps) {
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const showError = touched && error !== undefined

  return (
    <div className="reconstitution-field">
      <label htmlFor={id}>
        <span>{label}</span>
        {unit ? <span className="reconstitution-unit">{unit}</span> : null}
      </label>
      <input
        id={id}
        name={field}
        type="text"
        inputMode={field === 'label' ? undefined : 'decimal'}
        value={value}
        maxLength={maxLength}
        aria-label={label}
        aria-invalid={showError ? 'true' : undefined}
        aria-describedby={showError ? `${helperId} ${errorId}` : helperId}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <p className="reconstitution-helper" id={helperId}>{helper}</p>
      {showError ? <p className="reconstitution-error" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

function createHistoryId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    return `reconstitution-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  }
  throw new Error('Secure random API unavailable')
}

function formatStorageFailure(error: StorageOperationError): string {
  if ('code' in error && error.code) return formatDataManagementError(error)
  return messages.reconstitution.saveFailure
}

export function ReconstitutePage() {
  const [draft, setDraft] = useState<ReconstitutionDraft>(() => ({ ...INITIAL_RECONSTITUTION_DRAFT }))
  const [touched, setTouched] = useState<Set<ReconstitutionDraftField>>(() => new Set())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle', message: '' })

  const parsed = useMemo(() => parseReconstitutionDraft(draft), [draft])
  const computation = useMemo<Computation | undefined>(() => {
    if (!parsed.input) return undefined
    const calculated = calculateReconstitution(parsed.input)
    if (calculated.ok) {
      return { input: parsed.input, result: calculated.value, errors: [] }
    }
    return { input: parsed.input, errors: calculated.error }
  }, [parsed])

  const result = computation?.result
  const hasValidResult = result !== undefined && computation?.errors.length === 0
  const blockingError = computation?.errors.find((error) => error.code === 'DOSE_EXCEEDS_VIAL_CONTENT')
  const copyText = hasValidResult && computation ? buildReconstitutionCopyText(computation.input, result) : ''

  function updateDraft(field: ReconstitutionDraftField, value: string): void {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaveStatus({ kind: 'idle', message: '' })
  }

  function markTouched(field: ReconstitutionDraftField): void {
    setTouched((current) => {
      if (current.has(field)) return current
      const next = new Set(current)
      next.add(field)
      return next
    })
  }

  function clearForm(): void {
    setDraft({ ...INITIAL_RECONSTITUTION_DRAFT })
    setTouched(new Set())
    setSaveStatus({ kind: 'idle', message: '' })
  }

  async function saveCurrentCalculation(): Promise<void> {
    if (!hasValidResult || !computation || !result) return

    setSaveStatus({ kind: 'saving', message: messages.reconstitution.saving })
    try {
      const record = createReconstitutionCalculationRecord({
        id: createHistoryId(),
        createdAt: new Date().toISOString(),
        input: computation.input,
        result,
      })
      const outcome = await addCalculationRecord(record)
      if (!outcome.ok) {
        setSaveStatus({ kind: 'failure', message: formatStorageFailure(outcome.error) })
        return
      }

      const consentEnabled = getPersistenceConsent()
      const baseMessage = !consentEnabled
        ? messages.reconstitution.saveSessionSuccess
        : getStorageMode() === 'persistent-ok'
          ? messages.reconstitution.saveSuccess
          : messages.reconstitution.saveDegradedSuccess
      const evictionMessage = outcome.evictedCount > 0
        ? messages.reconstitution.saveEviction(outcome.evictedCount)
        : ''
      setSaveStatus({ kind: 'success', message: `${baseMessage}${evictionMessage}` })
    } catch {
      setSaveStatus({ kind: 'failure', message: messages.reconstitution.saveFailure })
    }
  }

  return (
    <section className="page reconstitution-page">
      <header className="reconstitution-header">
        <h1 className="page-title">{messages.nav.reconstituir}</h1>
        <p className="page-description">{messages.pages.reconstituir}</p>
        <p className="reconstitution-disclaimer">{messages.reconstitution.description}</p>
      </header>

      <div className="reconstitution-layout">
        <form className="card reconstitution-form" onSubmit={(event) => event.preventDefault()} noValidate>
          <h2>{messages.reconstitution.formTitle}</h2>
          <TextField
            id="reconstitution-label"
            field="label"
            label={messages.reconstitution.identificationLabel}
            helper={messages.reconstitution.identificationHelper}
            value={draft.label}
            error={parsed.fieldErrors.label}
            touched={touched.has('label')}
            maxLength={UX_LIMITS.NAME_MAX_CHARS}
            onChange={(value) => updateDraft('label', value)}
            onBlur={() => markTouched('label')}
          />
          <TextField
            id="reconstitution-vial-mass"
            field="vialMassMg"
            label={messages.reconstitution.vialMassLabel}
            unit={messages.reconstitution.vialMassUnit}
            helper={messages.reconstitution.vialMassHelper}
            value={draft.vialMassMg}
            error={parsed.fieldErrors.vialMassMg}
            touched={touched.has('vialMassMg')}
            onChange={(value) => updateDraft('vialMassMg', value)}
            onBlur={() => markTouched('vialMassMg')}
          />
          <TextField
            id="reconstitution-diluent"
            field="diluentVolumeMl"
            label={messages.reconstitution.diluentLabel}
            unit={messages.reconstitution.diluentUnit}
            helper={messages.reconstitution.diluentHelper}
            value={draft.diluentVolumeMl}
            error={parsed.fieldErrors.diluentVolumeMl}
            touched={touched.has('diluentVolumeMl')}
            onChange={(value) => updateDraft('diluentVolumeMl', value)}
            onBlur={() => markTouched('diluentVolumeMl')}
          />
          <TextField
            id="reconstitution-dose"
            field="desiredDoseMcg"
            label={messages.reconstitution.doseLabel}
            unit={messages.reconstitution.doseUnit}
            helper={messages.reconstitution.doseHelper}
            value={draft.desiredDoseMcg}
            error={parsed.fieldErrors.desiredDoseMcg}
            touched={touched.has('desiredDoseMcg')}
            onChange={(value) => updateDraft('desiredDoseMcg', value)}
            onBlur={() => markTouched('desiredDoseMcg')}
          />

          <div className="reconstitution-field">
            <span className="reconstitution-label">{messages.reconstitution.syringeFamilyLabel}</span>
            <output className="reconstitution-static-value" aria-label={messages.reconstitution.syringeFamilyLabel}>
              {messages.reconstitution.syringeFamilyValue}
            </output>
          </div>

          <div className="reconstitution-field">
            <label htmlFor="reconstitution-capacity">
              <span>{messages.reconstitution.syringeCapacityLabel}</span>
              <span className="reconstitution-unit">{messages.reconstitution.syringeCapacityUnit}</span>
            </label>
            <select
              id="reconstitution-capacity"
              name="capacityUnits"
              aria-label={messages.reconstitution.syringeCapacityLabel}
              value={draft.capacityUnits}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft('capacityUnits', event.target.value as ReconstitutionDraft['capacityUnits'])}
              onBlur={() => markTouched('capacityUnits')}
            >
              {CAPACITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <TextField
            id="reconstitution-graduation"
            field="graduationUnits"
            label={messages.reconstitution.syringeGraduationLabel}
            unit={messages.reconstitution.syringeGraduationUnit}
            helper={messages.reconstitution.syringeGraduationHelper}
            value={draft.graduationUnits}
            error={parsed.fieldErrors.graduationUnits}
            touched={touched.has('graduationUnits')}
            onChange={(value) => updateDraft('graduationUnits', value)}
            onBlur={() => markTouched('graduationUnits')}
          />

          <button type="button" className="reconstitution-button reconstitution-button--clear" onClick={clearForm}>
            {messages.reconstitution.clear}
          </button>
        </form>

        <div className="card reconstitution-results" aria-live="polite">
          {blockingError ? (
            <section className="reconstitution-alert" role="alert" aria-labelledby="reconstitution-alert-title">
              <h2 id="reconstitution-alert-title">{messages.reconstitution.alertTitle}</h2>
              <p>{formatDomainError(blockingError)}</p>
            </section>
          ) : hasValidResult && computation ? (
            <ResultPanel input={computation.input} result={result} />
          ) : computation?.errors.length ? (
            <section className="reconstitution-alert" role="alert" aria-labelledby="reconstitution-alert-title">
              <h2 id="reconstitution-alert-title">{messages.reconstitution.alertTitle}</h2>
              <p>{formatDomainError(computation.errors[0])}</p>
            </section>
          ) : (
            <p className="reconstitution-empty">{messages.reconstitution.emptyState}</p>
          )}

          <div className="reconstitution-actions">
            <CopyButton text={copyText} disabled={!hasValidResult} />
            <SaveToHistoryButton
              disabled={!hasValidResult}
              saving={saveStatus.kind === 'saving'}
              onSave={saveCurrentCalculation}
            />
          </div>
          <p className="reconstitution-status reconstitution-status--save" aria-live="polite">
            {saveStatus.message}
          </p>
        </div>
      </div>
    </section>
  )
}
