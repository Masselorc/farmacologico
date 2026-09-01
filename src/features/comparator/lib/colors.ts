import type { PaletteColorId } from '../../../domain/types'

export const DEFAULT_SCENARIO_COLORS: readonly PaletteColorId[] = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
] as const

export function getScenarioColorByIndex(index: number): PaletteColorId {
  return DEFAULT_SCENARIO_COLORS[Math.abs(index) % DEFAULT_SCENARIO_COLORS.length]
}

export function sanitizeColor(color: string): PaletteColorId {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color as PaletteColorId
  }
  return DEFAULT_SCENARIO_COLORS[0]
}
