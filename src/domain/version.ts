// Versões dos engines (§7): evolução INDEPENDENTE por engine.
// NUNCA derivar de package.json.
export const PK_ENGINE_VERSION = '1.0.0'
export const RECURRENCE_ENGINE_VERSION = '1.0.0'
export const RECONSTITUTION_ENGINE_VERSION = '1.0.0'

export const CURRENT_DATASET_VERSION = 1

export const ENGINE_VERSIONS = {
  pk: PK_ENGINE_VERSION,
  recurrence: RECURRENCE_ENGINE_VERSION,
  reconstitution: RECONSTITUTION_ENGINE_VERSION,
} as const
