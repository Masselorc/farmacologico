import { describe, expect, it } from 'vitest'
import { MS_PER_DAY } from '../../../domain/units/convert'
import type { LocalDate, LocalTime } from '../../../domain/types'
import {
  buildDoseFromDraft,
  buildScenarioFromDraft,
  doseToDraft,
  type DoseInputDraft,
  type ScenarioDraft,
} from '../../../features/comparator/lib/form'

describe('Comparator Form helpers (§15, E9)', () => {
  const calendarTimeZone = 'America/Sao_Paulo'

  it('cria cenário manual com decimais pt-BR e converte para ms', () => {
    const draft: ScenarioDraft = {
      id: 'sc-test',
      name: 'Cenário Teste',
      color: '#2563eb',
      halfLifeText: '6,5',
      halfLifeUnit: 'days',
      tmaxText: '2,0',
      tmaxUnit: 'days',
      displayUnit: 'mg',
      source: { type: 'manual' },
    }

    const result = buildScenarioFromDraft(draft)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const scenario = result.scenario
    expect(scenario.name).toBe('Cenário Teste')
    expect(scenario.selectedPkParameters.halfLifeMs).toBe(6.5 * MS_PER_DAY)
    expect(scenario.selectedPkParameters.tmaxMs).toBe(2 * MS_PER_DAY)

    expect(scenario.source.type).toBe('manual')
    if (scenario.source.type === 'manual') {
      expect(scenario.source.pkParametersSnapshot?.halfLife.value).toBe(6.5)
      expect(scenario.source.pkParametersSnapshot?.halfLife.unit).toBe('days')
      expect(scenario.source.pkParametersSnapshot?.tmax?.value).toBe(2)
      expect(scenario.source.pkParametersSnapshot?.tmax?.unit).toBe('days')
    }
  })

  it('trata Tmax = 0 como absorção imediata (tmaxMs = null)', () => {
    const draft: ScenarioDraft = {
      id: 'sc-tmax0',
      name: 'Cenário Imediato',
      color: '#059669',
      halfLifeText: '12',
      halfLifeUnit: 'hours',
      tmaxText: '0',
      tmaxUnit: 'days',
      displayUnit: 'mg',
      source: { type: 'manual' },
    }

    const result = buildScenarioFromDraft(draft)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.scenario.selectedPkParameters.tmaxMs).toBeNull()
    if (result.scenario.source.type === 'manual') {
      expect(result.scenario.source.pkParametersSnapshot?.tmax).toBeNull()
    }
  })

  it('converte dose informada em mcg para mg no domínio', () => {
    const draft: DoseInputDraft = {
      id: 'dose-1',
      amountText: '250',
      localDate: '2026-09-01' as LocalDate,
      localTime: '08:00' as LocalTime,
    }

    const result = buildDoseFromDraft(draft, 'mcg', calendarTimeZone)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.dose.amountMg).toBe(0.25)
    // 2026-09-01 08:00 em America/Sao_Paulo (-03:00) -> 11:00 UTC
    expect(result.dose.time).toBe('2026-09-01T11:00:00Z')
  })

  it('preserva o instante canônico quando re-editado sem alteração temporal', () => {
    const originalDose = {
      id: 'dose-orig',
      amountMg: 10,
      time: '2026-09-01T11:00:00Z',
    }

    const draft = doseToDraft(originalDose, 'mg', calendarTimeZone)
    expect(draft.localDate).toBe('2026-09-01')
    expect(draft.localTime).toBe('08:00')

    const rebuilt = buildDoseFromDraft(draft, 'mg', calendarTimeZone)
    expect(rebuilt.ok).toBe(true)
    if (!rebuilt.ok) return
    expect(rebuilt.dose.time).toBe(originalDose.time)
  })

  it('rejeita cenário com nome vazio ou meia-vida inválida', () => {
    const draft: ScenarioDraft = {
      id: 'sc-inv',
      name: '   ',
      color: '#2563eb',
      halfLifeText: 'abc',
      halfLifeUnit: 'days',
      tmaxText: '0',
      tmaxUnit: 'days',
      displayUnit: 'mg',
      source: { type: 'manual' },
    }

    const result = buildScenarioFromDraft(draft)
    expect(result.ok).toBe(false)
  })
})
