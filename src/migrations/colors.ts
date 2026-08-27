import type { DisplayColor } from '../domain/types'
import type { MigrationPaletteEntry } from './types'

export const LEGACY_COLORS = [
  '#9b59b6', '#27ae60', '#1abc9c', '#2ecc71', '#e74c3c', '#3498db', '#f1c40f', '#c0392b',
  '#2c3e50', '#8e44ad', '#e67e22', '#d35400', '#ff7979', '#f39c12', '#ff9f43',
] as const

export const LEGACY_COLOR_FALLBACK = '#3498db'
export const MEIAVIDA_LEGACY_SCENARIO_COLORS = [
  '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2',
] as const

export const DEFAULT_MIGRATION_PALETTE: MigrationPaletteEntry[] = [
  ...LEGACY_COLORS,
  ...MEIAVIDA_LEGACY_SCENARIO_COLORS,
].map((hex) => ({ id: hex, hex }))

const HEX = /^#[0-9a-f]{6}$/i

function channels(hex: string): [number, number, number] {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)]
}

export function normalizeHex(value: unknown): string | null {
  return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : null
}

export function nearestPaletteColor(hex: string, palette: MigrationPaletteEntry[]): string {
  const [r, g, b] = channels(hex)
  const candidates = palette
    .map((entry) => ({ ...entry, normalized: normalizeHex(entry.hex) }))
    .filter((entry): entry is MigrationPaletteEntry & { normalized: string } => entry.normalized !== null && entry.id.trim() !== '')
    .map((entry) => {
      const [er, eg, eb] = channels(entry.normalized)
      return { id: entry.id, distance: (r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2 }
    })
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
  return candidates[0]?.id ?? LEGACY_COLOR_FALLBACK
}

export function mapLegacyColor(value: unknown, palette = DEFAULT_MIGRATION_PALETTE): {
  displayColor: DisplayColor
  invalid: boolean
  remappedFrom?: string
} {
  const normalized = normalizeHex(value)
  if (!normalized) return { displayColor: { paletteColor: LEGACY_COLOR_FALLBACK }, invalid: true }
  const exact = palette.find((entry) => normalizeHex(entry.hex) === normalized)
  if (exact) return { displayColor: { paletteColor: exact.id }, invalid: false }
  const mapped = nearestPaletteColor(normalized, palette)
  return {
    displayColor: { paletteColor: mapped, legacyOriginalHex: normalized },
    invalid: false,
    remappedFrom: normalized,
  }
}
