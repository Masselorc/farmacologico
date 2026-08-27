// Gerenciamento do consentimento explícito para persistência de dados (§10, §11).
// Padrão: DESLIGADO (opt-in).
// Armazenamento em chave técnica de localStorage (fk:v1:persistence-consent).
// Não integra ConfigPayload nem FullBackupBundle e nunca é exportado/restaurado.

import { isValidTimeZoneId } from '../domain/shared/datetime'
import type { TimeZoneId } from '../domain/shared/types.datetime'

const CONSENT_STORAGE_KEY = 'fk:v1:persistence-consent'

type ConsentListener = (enabled: boolean) => void
const listeners = new Set<ConsentListener>()

let inMemoryConsent: boolean = false

/**
 * Detecta o fuso horário inicial a partir do dispositivo no primeiro uso (§10, §11).
 * Usa Intl.DateTimeFormat().resolvedOptions().timeZone com validação IANA e fallback para 'UTC'.
 */
export function detectInitialCalendarTimeZone(): TimeZoneId {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz && isValidTimeZoneId(tz)) {
        return tz
      }
    }
  } catch {
    // Fallback seguro caso ambiente restrinja Intl
  }
  return 'UTC'
}

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
      if (enabled) {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, 'true')
      } else {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, 'false')
      }
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
 * Desativa a persistência com purge físico obrigatório (§10, §11).
 * Executa o purge incondicionalmente no IndexedDB antes de desligar o consentimento.
 */
export async function disablePersistenceAndPurge(
  purgeStorageFn: () => Promise<void>,
): Promise<void> {
  // 1. Purge físico dos dados persistidos (independente de consentimento)
  await purgeStorageFn()

  // 2. Desativação explícita do consentimento
  setPersistenceConsent(false)
}

/**
 * Helper retrocompatível para desativação com purge.
 */
export async function disablePersistenceAndClear(
  clearStorageFn?: () => Promise<void>,
): Promise<void> {
  if (clearStorageFn) {
    await clearStorageFn()
  }
  setPersistenceConsent(false)
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
