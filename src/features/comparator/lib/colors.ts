import {
  DEFAULT_SCENARIO_COLORS,
  LEGACY_SCENARIO_COLORS,
  PALETTE_ALLOWED,
  sanitizePaletteColor,
  type PaletteColorId,
} from '../../../domain/shared/colors'

export {
  DEFAULT_SCENARIO_COLORS,
  LEGACY_SCENARIO_COLORS,
  PALETTE_ALLOWED,
  sanitizePaletteColor,
}
export type { PaletteColorId }

export function getScenarioColorByIndex(index: number): PaletteColorId {
  return DEFAULT_SCENARIO_COLORS[Math.abs(index) % DEFAULT_SCENARIO_COLORS.length]
}

export function sanitizeColor(color: unknown): PaletteColorId {
  return sanitizePaletteColor(color)
}

export function colorToSlug(color: string): string {
  const sanitized = sanitizeColor(color)
  return sanitized.replace('#', '').toLowerCase()
}

export function getToneColorClass(color: string): string {
  return `tone-color-${colorToSlug(color)}`
}

export function getToneBgClass(color: string): string {
  return `tone-bg-${colorToSlug(color)}`
}

export function getToneBorderTopClass(color: string): string {
  return `tone-border-top-${colorToSlug(color)}`
}
