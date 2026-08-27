// Gerenciamento do consentimento explícito para persistência de dados (§10, §11).
// Padrão: DESLIGADO (opt-in).
// Armazenamento em chave técnica de localStorage (fk:v1:persistence-consent).
// Não integra ConfigPayload nem FullBackupBundle e nunca é exportado/restaurado.

const CONSENT_STORAGE_KEY = 'fk:v1:persistence-consent'

type ConsentListener = (enabled: boolean) => void
const listeners = new Set<ConsentListener>()

let inMemoryConsent: boolean = false

/**
 * Lê o estado atual do consentimento de persistência.
 * Retorna false por padrão.
 */
export function getPersistenceConsent(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
      if (stored !== null) {
        return stored === 'true'
      }
    }
  } catch {
    // Ignora erro de acesso a localStorage em sandbox/iframe
  }
  return inMemoryConsent
}

/**
 * Atualiza o estado do consentimento de persistência e notifica os listeners inscritos.
 */
export function setPersistenceConsent(enabled: boolean): void {
  inMemoryConsent = enabled
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, enabled ? 'true' : 'false')
    }
  } catch {
    // Ignora erro de acesso
  }
  for (const listener of listeners) {
    try {
      listener(enabled)
    } catch {
      // Ignora erro em listener individual
    }
  }
}

/**
 * Inscreve um listener para alterações de consentimento. Retorna função de unsubscribe.
 */
export function subscribePersistenceConsent(listener: ConsentListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Desativa a persistência e executa o callback de limpeza de dados persistidos.
 */
export async function disablePersistenceAndClear(
  clearStorageFn?: () => Promise<void>,
): Promise<void> {
  setPersistenceConsent(false)
  if (clearStorageFn) {
    await clearStorageFn()
  }
}

/**
 * Helper para testes: redefine o estado interno e os listeners.
 */
export function resetPersistenceConsentForTesting(): void {
  inMemoryConsent = false
  listeners.clear()
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY)
    }
  } catch {
    // Ignora
  }
}
