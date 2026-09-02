import { messages } from '../../../app/i18n/pt-BR.messages'
import { civilToInstantIso, instantToZonedParts } from '../../../domain/shared/datetime'
import { parseLocaleDecimal } from '../../../domain/units/decimal'
import {
  fromMilligrams,
  millisecondsToDays,
  millisecondsToHours,
  millisecondsToMinutes,
  MS_PER_DAY,
  MS_PER_HOUR,
  toMilliseconds,
  toMilligrams,
} from '../../../domain/units/convert'
import type {
  Dose,
  LocalDate,
  LocalTime,
  MassUnit,
  Scenario,
  ScenarioSource,
  TimeUnit,
  TimeZoneId,
} from '../../../domain/types'
import { scenarioSchema, doseSchema } from '../../../validation/schemas/scenario'
import { getScenarioColorByIndex, sanitizeColor } from './colors'

export interface ScenarioDraft {
  id: string
  name: string
  color: string
  halfLifeText: string
  halfLifeUnit: TimeUnit
  tmaxText: string
  tmaxUnit: TimeUnit
  displayUnit: MassUnit
  source: ScenarioSource
}

export interface DoseInputDraft {
  id: string
  amountText: string
  localDate: LocalDate
  localTime: LocalTime
}

export function createEmptyScenarioDraft(index = 0): ScenarioDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    color: getScenarioColorByIndex(index),
    halfLifeText: '',
    halfLifeUnit: 'days',
    tmaxText: '0',
    tmaxUnit: 'days',
    displayUnit: 'mg',
    source: {
      type: 'manual',
    },
  }
}

export function scenarioToDraft(scenario: Scenario): ScenarioDraft {
  let halfLifeText: string
  let halfLifeUnit: TimeUnit
  let tmaxText: string
  let tmaxUnit: TimeUnit

  if (scenario.source.type === 'manual' && scenario.source.pkParametersSnapshot) {
    const snap = scenario.source.pkParametersSnapshot
    halfLifeText = String(snap.halfLife.value).replace('.', ',')
    halfLifeUnit = snap.halfLife.unit
    if (snap.tmax) {
      tmaxText = String(snap.tmax.value).replace('.', ',')
      tmaxUnit = snap.tmax.unit
    } else {
      tmaxText = '0'
      tmaxUnit = 'days'
    }
  } else {
    // Derived from selectedPkParameters
    const halfLifeMs = scenario.selectedPkParameters.halfLifeMs
    const tmaxMs = scenario.selectedPkParameters.tmaxMs

    if (halfLifeMs % MS_PER_DAY === 0) {
      halfLifeText = String(millisecondsToDays(halfLifeMs))
      halfLifeUnit = 'days'
    } else if (halfLifeMs % MS_PER_HOUR === 0) {
      halfLifeText = String(millisecondsToHours(halfLifeMs))
      halfLifeUnit = 'hours'
    } else {
      halfLifeText = String(millisecondsToMinutes(halfLifeMs))
      halfLifeUnit = 'minutes'
    }

    if (tmaxMs === null || tmaxMs === 0) {
      tmaxText = '0'
      tmaxUnit = 'days'
    } else if (tmaxMs % MS_PER_DAY === 0) {
      tmaxText = String(millisecondsToDays(tmaxMs))
      tmaxUnit = 'days'
    } else if (tmaxMs % MS_PER_HOUR === 0) {
      tmaxText = String(millisecondsToHours(tmaxMs))
      tmaxUnit = 'hours'
    } else {
      tmaxText = String(millisecondsToMinutes(tmaxMs))
      tmaxUnit = 'minutes'
    }
  }

  return {
    id: scenario.id,
    name: scenario.name,
    color: scenario.color,
    halfLifeText,
    halfLifeUnit,
    tmaxText,
    tmaxUnit,
    displayUnit: scenario.displayUnit,
    source: scenario.source,
  }
}

export function buildScenarioFromDraft(
  draft: ScenarioDraft,
  existingDoses: ReadonlyArray<Dose> = [],
): { ok: true; scenario: Scenario } | { ok: false; errors: string[] } {
  const errors: string[] = []

  const trimmedName = draft.name.trim()
  if (!trimmedName) {
    errors.push(messages.comparator.scenarioNameRequired)
  }

  const hlParsed = parseLocaleDecimal(draft.halfLifeText)
  if (!hlParsed.ok || hlParsed.value <= 0) {
    errors.push(messages.comparator.halfLifeInvalid)
  }

  const tmaxParsed = parseLocaleDecimal(draft.tmaxText)
  if (!tmaxParsed.ok || tmaxParsed.value < 0) {
    errors.push(messages.comparator.tmaxInvalid)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const halfLifeMs = toMilliseconds(hlParsed.ok ? hlParsed.value : 0, draft.halfLifeUnit)
  const isImmediateTmax = !tmaxParsed.ok || tmaxParsed.value === 0
  const tmaxMs = isImmediateTmax ? null : toMilliseconds(tmaxParsed.value, draft.tmaxUnit)

  const source: ScenarioSource =
    draft.source.type === 'manual'
      ? {
          type: 'manual',
          pkParametersSnapshot: {
            halfLife: {
              value: hlParsed.ok ? hlParsed.value : 0,
              unit: draft.halfLifeUnit,
            },
            tmax: isImmediateTmax
              ? null
              : {
                  value: tmaxParsed.ok ? tmaxParsed.value : 0,
                  unit: draft.tmaxUnit,
                },
          },
        }
      : draft.source

  const candidate: Scenario = {
    id: draft.id || crypto.randomUUID(),
    name: trimmedName,
    color: sanitizeColor(draft.color),
    source,
    displayUnit: draft.displayUnit,
    selectedPkParameters: {
      halfLifeMs,
      tmaxMs,
    },
    doses: [...existingDoses],
  }

  const parseResult = scenarioSchema.safeParse(candidate)
  if (!parseResult.success) {
    const zodErrors = parseResult.error.issues.map((issue) => issue.message)
    return { ok: false, errors: zodErrors }
  }

  return { ok: true, scenario: parseResult.data }
}

export function doseToDraft(
  dose: Dose,
  displayUnit: MassUnit,
  calendarTimeZone: TimeZoneId,
): DoseInputDraft {
  const converted = fromMilligrams(dose.amountMg, displayUnit)
  const parts = instantToZonedParts({ instantIso: dose.time, timeZone: calendarTimeZone })
  return {
    id: dose.id,
    amountText: String(converted).replace('.', ','),
    localDate: parts.localDate,
    localTime: parts.localTime,
  }
}

export function buildDoseFromDraft(
  draft: DoseInputDraft,
  displayUnit: MassUnit,
  calendarTimeZone: TimeZoneId,
): { ok: true; dose: Dose } | { ok: false; errors: string[] } {
  const errors: string[] = []

  const parsedAmount = parseLocaleDecimal(draft.amountText)
  if (!parsedAmount.ok || parsedAmount.value <= 0) {
    errors.push(messages.comparator.doseAmountInvalid)
  }

  let instantIso = ''
  try {
    instantIso = civilToInstantIso({
      localDate: draft.localDate,
      localTime: draft.localTime,
      timeZone: calendarTimeZone,
    })
  } catch {
    errors.push(messages.comparator.doseDateTimeInvalid)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const amountMg = toMilligrams(parsedAmount.ok ? parsedAmount.value : 0, displayUnit)

  const candidate: Dose = {
    id: draft.id || crypto.randomUUID(),
    amountMg,
    time: instantIso,
  }

  const parseResult = doseSchema.safeParse(candidate)
  if (!parseResult.success) {
    const zodErrors = parseResult.error.issues.map((issue) => issue.message)
    return { ok: false, errors: zodErrors }
  }

  return { ok: true, dose: parseResult.data }
}
