import type { PaletteColorId } from '../../../domain/types'

export const DEFAULT_SCENARIO_COLORS: readonly PaletteColorId[] = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
] as const

export const LEGACY_SCENARIO_COLORS: readonly PaletteColorId[] = [
  '#9b59b6',
  '#27ae60',
  '#1abc9c',
  '#2ecc71',
  '#e74c3c',
  '#3498db',
  '#f1c40f',
  '#c0392b',
  '#2c3e50',
  '#8e44ad',
  '#e67e22',
  '#d35400',
  '#ff7979',
  '#f39c12',
  '#ff9f43',
] as const

export const PALETTE_ALLOWED: readonly PaletteColorId[] = [
  ...DEFAULT_SCENARIO_COLORS,
  ...LEGACY_SCENARIO_COLORS,
] as const

export function getScenarioColorByIndex(index: number): PaletteColorId {
  return DEFAULT_SCENARIO_COLORS[Math.abs(index) % DEFAULT_SCENARIO_COLORS.length]
}

export function sanitizeColor(color: string): PaletteColorId {
  if (typeof color !== 'string') return DEFAULT_SCENARIO_COLORS[0]
  const normalized = color.toLowerCase().trim()
  const match = PALETTE_ALLOWED.find((c) => c.toLowerCase() === normalized)
  if (match) {
    return match
  }
  return DEFAULT_SCENARIO_COLORS[0]
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
