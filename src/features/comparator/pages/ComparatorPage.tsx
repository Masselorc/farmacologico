import { useEffect, useMemo, useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { MS_PER_DAY } from '../../../domain/units/convert'
import { loadConfigPayload, mutateConfigPayload } from '../../../storage'
import type {
  ChartScaleMode,
  ChartYAxisMode,
  ConfigPayload,
  DisplayWindow,
  Scenario,
  TimeZoneId,
} from '../../../domain/types'
import { analyzeScenario, type ComparatorAnalyzedScenario, type ScenarioAnalysisError } from '../lib/analysis'
import { AnalysisPage } from './AnalysisPage'
import { EditPage } from './EditPage'
import '../comparator.css'

export function ComparatorPage() {
  const [config, setConfig] = useState<ConfigPayload | null>(null)
  const [nowMs, setNowMs] = useState<number>(0)
  const [displayWindow, setDisplayWindow] = useState<DisplayWindow | null>(null)
  const [scaleMode, setScaleMode] = useState<ChartScaleMode>('absolute')
  const [yAxisMode, setYAxisMode] = useState<ChartYAxisMode>('linear')
  const [activeTab, setActiveTab] = useState<'edit' | 'analysis'>('analysis')

  // Carrega configuração persistida inicial
  useEffect(() => {
    loadConfigPayload().then((payload) => {
      setConfig(payload)
      const currentNow = Date.now()
      setNowMs(currentNow)
      setDisplayWindow({
        startMs: currentNow - 7 * MS_PER_DAY,
        endMs: currentNow + 30 * MS_PER_DAY,
      })
    })
  }, [])

  // Relógio vivo de 1 segundo (§15, E9)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  const calendarTimeZone: TimeZoneId =
    config?.settings.calendarTimeZone ?? 'America/Sao_Paulo'
  const scenarios = useMemo<Scenario[]>(() => config?.scenarios ?? [], [config])

  const handleUpdateScenarios = async (updatedScenarios: Scenario[]): Promise<{ ok: boolean; error?: string }> => {
    if (!config) return { ok: false, error: messages.comparator.configNotLoaded }
    try {
      const result = await mutateConfigPayload((current) => ({
        ...current,
        scenarios: updatedScenarios,
      }))
      if (result.ok) {
        setConfig(result.payload)
        return { ok: true }
      }
      return { ok: false, error: messages.comparator.saveError }
    } catch {
      return { ok: false, error: messages.comparator.saveError }
    }
  }

  // Pipeline de análise memoizado
  const { analyzedScenarios, nonContributingScenarios, scenarioErrors } = useMemo(() => {
    if (!displayWindow || nowMs === 0) {
      return { analyzedScenarios: [], nonContributingScenarios: [], scenarioErrors: [] }
    }

    const analyzed: ComparatorAnalyzedScenario[] = []
    const nonContributing: string[] = []
    const errors: ScenarioAnalysisError[] = []

    for (const scenario of scenarios) {
      const result = analyzeScenario(
        scenario,
        displayWindow,
        nowMs,
        scaleMode,
        yAxisMode,
      )

      if (result.status === 'success') {
        analyzed.push(result.data)
      } else if (result.status === 'no_contributing_doses') {
        nonContributing.push(scenario.name)
      } else if (result.status === 'error') {
        errors.push({ scenario: result.scenario, error: result.error })
      }
    }

    return { analyzedScenarios: analyzed, nonContributingScenarios: nonContributing, scenarioErrors: errors }
  }, [scenarios, displayWindow, nowMs, scaleMode, yAxisMode])

  if (!config || !displayWindow) {
    return (
      <section className="page comparator-page">
        <h1 className="page-title">{messages.comparator.title}</h1>
        <p className="loading-notice">{messages.comparator.loadingComparator}</p>
      </section>
    )
  }

  return (
    <section className="page comparator-page">
      <div className="comparator-header">
        <div>
          <h1 className="page-title">{messages.comparator.title}</h1>
          <p className="comparator-subtitle">{messages.comparator.description}</p>
        </div>
        <div className="timezone-badge" role="note">
          {messages.comparator.timeZoneLabel(calendarTimeZone)}
        </div>
      </div>

      <div className="comparator-tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          {messages.comparator.analysisSectionTitle} ({analyzedScenarios.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          {messages.comparator.scenariosSectionTitle} ({scenarios.length})
        </button>
      </div>

      <div className="comparator-content">
        {activeTab === 'analysis' ? (
          <AnalysisPage
            analyzedScenarios={analyzedScenarios}
            nonContributingScenarios={nonContributingScenarios}
            scenarioErrors={scenarioErrors}
            displayWindow={displayWindow}
            calendarTimeZone={calendarTimeZone}
            scaleMode={scaleMode}
            yAxisMode={yAxisMode}
            onUpdateDisplayWindow={setDisplayWindow}
            onToggleScaleMode={setScaleMode}
            onToggleYAxisMode={setYAxisMode}
          />
        ) : (
          <EditPage
            scenarios={scenarios}
            calendarTimeZone={calendarTimeZone}
            onUpdateScenarios={handleUpdateScenarios}
          />
        )}
      </div>
    </section>
  )
}
