// Paleta canônica e fechada da FARMakit (§10, §15, E9.2).
// PALETTE_ALLOWED = PALETTE_MODERN ∪ LEGACY_COLORS (21 cores).

export const DEFAULT_SCENARIO_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
] as const

export const PALETTE_MODERN = DEFAULT_SCENARIO_COLORS

export const LEGACY_SCENARIO_COLORS = [
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

export const LEGACY_COLORS = LEGACY_SCENARIO_COLORS

export const PALETTE_ALLOWED = [
  ...PALETTE_MODERN,
  ...LEGACY_COLORS,
] as const

export type PaletteColorId = (typeof PALETTE_ALLOWED)[number]

export function isAllowedPaletteColor(color: string): color is PaletteColorId {
  const normalized = color.toLowerCase().trim()
  return (PALETTE_ALLOWED as readonly string[]).includes(normalized)
}

export function sanitizePaletteColor(color: unknown): PaletteColorId {
  if (typeof color !== 'string') return DEFAULT_SCENARIO_COLORS[0]
  const normalized = color.toLowerCase().trim()
  const match = PALETTE_ALLOWED.find((c) => c.toLowerCase() === normalized)
  return match ?? DEFAULT_SCENARIO_COLORS[0]
}
