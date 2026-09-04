import { parseLocaleDecimal } from '../../../domain/units/decimal'
import { toMilliseconds, millisecondsToDays } from '../../../domain/units/convert'
import { protocolSchema } from '../../../validation/schemas/protocol'
import { ok, type Result } from '../../../domain/shared/result'
import type {
  DisplayColor,
  IsoWeekday,
  LocalDate,
  LocalTime,
  Protocol,
  ProtocolComponent,
  ProtocolComponentSource,
  SelectedPkParameters,
  PkParametersSnapshot,
  TimeZoneId,
} from '../../../domain/types'

export interface ProtocolComponentDraft {
  id: string
  label: string
  proportion: string
  source: ProtocolComponentSource
  halfLifeDays: string
  tmaxDays: string
  displayColor: DisplayColor
  selectedPkParameters?: SelectedPkParameters
  pkParametersSnapshot?: PkParametersSnapshot
}

export interface ProtocolDraft {
  id?: string
  name: string
  totalDoseMg: string // começa estritamente vazio em novo protocolo (§19)
  startDate: LocalDate
  localTime: LocalTime
  timeZone: TimeZoneId
  recurrenceType: 'single' | 'weekly'
  weekdays: IsoWeekday[]
  weeks: string
  components: ProtocolComponentDraft[]
}

function formatDecimalDraft(val: number): string {
  if (!Number.isFinite(val)) return ''
  return String(val).replace('.', ',')
}

export function createEmptyProtocolDraft(
  calendarTimeZone: TimeZoneId,
  initialStartDate?: LocalDate,
): ProtocolDraft {
  return {
    name: '',
    totalDoseMg: '', // Obrigatório vazio
    startDate: initialStartDate ?? '2026-09-04',
    localTime: '08:00',
    timeZone: calendarTimeZone,
    recurrenceType: 'weekly',
    weekdays: [1], // Segunda-feira
    weeks: '12',
    components: [
      {
        id: crypto.randomUUID(),
        label: 'Componente 1',
        proportion: '1',
        source: { type: 'manual' },
        halfLifeDays: '6',
        tmaxDays: '2',
        displayColor: { paletteColor: '#2563eb' },
      },
    ],
  }
}

export function protocolToDraft(protocol: Protocol): ProtocolDraft {
  return {
    id: protocol.id,
    name: protocol.name,
    totalDoseMg: formatDecimalDraft(protocol.totalDoseMg),
    startDate: protocol.schedule.startDate,
    localTime: protocol.schedule.localTime,
    timeZone: protocol.schedule.timeZone,
    recurrenceType: protocol.schedule.recurrence.type,
    weekdays:
      protocol.schedule.recurrence.type === 'weekly'
        ? [...protocol.schedule.recurrence.weekdays]
        : [1],
    weeks:
      protocol.schedule.recurrence.type === 'weekly'
        ? String(protocol.schedule.recurrence.weeks)
        : '12',
    components: protocol.components.map((comp) => {
      const hlDays = millisecondsToDays(comp.selectedPkParameters.halfLifeMs)
      const tmaxDays =
        comp.selectedPkParameters.tmaxMs !== null
          ? millisecondsToDays(comp.selectedPkParameters.tmaxMs)
          : 0

      return {
        id: comp.id,
        label: comp.label,
        proportion: formatDecimalDraft(comp.proportion),
        source: comp.source,
        halfLifeDays: formatDecimalDraft(hlDays),
        tmaxDays: formatDecimalDraft(tmaxDays),
        displayColor: comp.displayColor,
        selectedPkParameters: comp.selectedPkParameters,
        pkParametersSnapshot: comp.pkParametersSnapshot,
      }
    }),
  }
}

export function draftToProtocol(
  draft: ProtocolDraft,
  existingProtocol?: Protocol,
): Result<Protocol, string[]> {
  const errors: string[] = []

  const totalDoseRes = parseLocaleDecimal(draft.totalDoseMg)
  if (!totalDoseRes.ok || totalDoseRes.value <= 0) {
    errors.push('Informe uma dose total válida maior que zero.')
  }
  const totalDoseMg = totalDoseRes.ok ? totalDoseRes.value : 0

  const weeksInt = parseInt(draft.weeks, 10)
  if (draft.recurrenceType === 'weekly' && (!Number.isInteger(weeksInt) || weeksInt < 1 || weeksInt > 520)) {
    errors.push('Duração em semanas deve ser um número inteiro entre 1 e 520.')
  }

  const components: ProtocolComponent[] = []

  for (let i = 0; i < draft.components.length; i++) {
    const cd = draft.components[i]!
    const propRes = parseLocaleDecimal(cd.proportion)
    if (!propRes.ok || propRes.value <= 0) {
      errors.push(`Componente ${i + 1}: proporção deve ser maior que zero.`)
      continue
    }

    let selectedPkParameters: SelectedPkParameters
    let pkParametersSnapshot: PkParametersSnapshot

    if (cd.source.type === 'manual') {
      const hlRes = parseLocaleDecimal(cd.halfLifeDays)
      if (!hlRes.ok || hlRes.value <= 0) {
        errors.push(`Componente ${i + 1}: meia-vida deve ser maior que zero.`)
        continue
      }

      const tmaxRes = parseLocaleDecimal(cd.tmaxDays)
      if (!tmaxRes.ok || tmaxRes.value < 0) {
        errors.push(`Componente ${i + 1}: Tmax deve ser maior ou igual a zero.`)
        continue
      }

      const halfLifeMs = toMilliseconds(hlRes.value, 'days')
      const tmaxMs = tmaxRes.value === 0 ? null : toMilliseconds(tmaxRes.value, 'days')

      selectedPkParameters = {
        halfLifeMs,
        tmaxMs,
      }

      pkParametersSnapshot = {
        halfLife: { value: hlRes.value, unit: 'days' },
        tmax: tmaxRes.value === 0 ? null : { value: tmaxRes.value, unit: 'days' },
      }
    } else {
      if (!cd.selectedPkParameters || !cd.pkParametersSnapshot) {
        errors.push(`Componente ${i + 1}: parâmetros farmacocinéticos vinculados ausentes.`)
        continue
      }
      selectedPkParameters = cd.selectedPkParameters
      pkParametersSnapshot = cd.pkParametersSnapshot
    }

    components.push({
      id: cd.id || crypto.randomUUID(),
      label: cd.label.trim(),
      proportion: propRes.value,
      source: cd.source,
      selectedPkParameters,
      pkParametersSnapshot,
      displayColor: cd.displayColor,
    })
  }

  if (errors.length > 0) {
    return { ok: false, error: errors }
  }

  const nowIso = new Date().toISOString()
  const candidate: Protocol = {
    id: draft.id || existingProtocol?.id || crypto.randomUUID(),
    name: draft.name.trim(),
    totalDoseMg,
    schedule: {
      startDate: draft.startDate,
      localTime: draft.localTime,
      timeZone: draft.timeZone,
      recurrence:
        draft.recurrenceType === 'single'
          ? { type: 'single' }
          : {
              type: 'weekly',
              weekdays: [...draft.weekdays].sort((a, b) => a - b),
              weeks: weeksInt,
            },
    },
    components,
    createdAt: existingProtocol?.createdAt || nowIso,
    updatedAt: nowIso,
  }

  const parseResult = protocolSchema.safeParse(candidate)
  if (!parseResult.success) {
    return {
      ok: false,
      error: parseResult.error.issues.map((iss) => iss.message),
    }
  }

  return ok(parseResult.data)
}
