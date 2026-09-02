import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import {
  addCalculationRecord,
  getPersistenceConsent,
  getStorageMode,
} from '../../../storage'
import type {
  ChartScaleMode,
  ChartYAxisMode,
  DisplayWindow,
  TimeZoneId,
} from '../../../domain/types'
import type { ComparatorAnalyzedScenario } from '../lib/analysis'
import { createComparatorCalculationRecord } from '../lib/historyRecord'

export interface SaveAnalysisButtonProps {
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
  displayWindow: DisplayWindow
  calendarTimeZone: TimeZoneId
  scaleMode: ChartScaleMode
  yAxisMode: ChartYAxisMode
}

export function SaveAnalysisButton({
  analyzedScenarios,
  displayWindow,
  calendarTimeZone,
  scaleMode,
  yAxisMode,
}: SaveAnalysisButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const handleSave = async () => {
    if (analyzedScenarios.length === 0 || isSaving) return

    setIsSaving(true)
    setFeedback(null)

    try {
      const record = createComparatorCalculationRecord({
        analyzedScenarios,
        displayWindow,
        calendarTimeZone,
        scaleMode,
        yAxisMode,
      })

      const result = await addCalculationRecord(record)

      if (!result.ok) {
        if (result.error.code === 'CALCULATION_RECORD_TOO_LARGE') {
          setFeedback({
            type: 'error',
            message: `${messages.comparator.saveFailure} ${messages.comparator.recordTooLarge}`,
          })
        } else {
          setFeedback({
            type: 'error',
            message: messages.comparator.saveFailure,
          })
        }
        return
      }

      const isConsentOn = getPersistenceConsent()
      const storageMode = getStorageMode()
      let baseMessage: string = messages.comparator.saveSuccess

      if (!isConsentOn) {
        baseMessage = messages.comparator.saveSessionSuccess
      } else if (storageMode === 'degraded-memory') {
        baseMessage = messages.comparator.saveDegradedSuccess
      }

      if (result.evictedCount > 0) {
        baseMessage += messages.comparator.saveEviction(result.evictedCount)
      }

      setFeedback({
        type: 'success',
        message: baseMessage,
      })
    } catch {
      setFeedback({
        type: 'error',
        message: messages.comparator.saveFailure,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="save-analysis-container">
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSave}
        disabled={isSaving || analyzedScenarios.length === 0}
      >
        {isSaving ? messages.comparator.savingAnalysis : messages.comparator.saveAnalysis}
      </button>

      {feedback && (
        <div
          className={`save-feedback ${feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </div>
      )}
    </div>
  )
}
