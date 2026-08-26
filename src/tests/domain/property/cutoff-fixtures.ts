// Fixtures compartilhadas do gate de cutoff E4.
export const MS_PER_DAY = 86_400_000
export const MS_PER_HOUR = 3_600_000

/** Frações analíticas do caso degenerado exato ka=ke com k·Tmax=1 na idade Tmax+44·T½term. */
export const DEGENERATE_CENTRAL_FRACTION = 6.5868117237e-13
export const DEGENERATE_DEPOT_FRACTION = 2.0911525165e-14
export const DEGENERATE_TOTAL_FRACTION = 6.7959269753e-13
export const INSTANT_RESIDUAL_FRACTION = Math.pow(2, -44) // ≈ 5.6843418861e-14
