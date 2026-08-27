// Helper centralizado para prevenção de aliasing (copy-in / copy-out) (§11, E6.3).
// Garante isolamento estrito de referências entre o chamador e a memória interna do storage.

/**
 * Cria uma cópia profunda e independente de um valor persistido.
 * Utiliza `structuredClone` com fallback JSON-safe para ambientes restritos.
 */
export function clonePersistedValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Fallback defensivo caso o objeto contenha tipos não-clonáveis pelo structuredClone
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}
