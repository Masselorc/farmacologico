// Gerenciamento do consentimento explícito para persistência de dados (§10, §11, E6.3).
// Padrão: DESLIGADO (opt-in).
// Armazenamento em chave técnica de localStorage (fk:v1:persistence-consent).
// Não integra ConfigPayload nem FullBackupBundle e nunca é exportado/restaurado.

import { isValidTimeZoneId } from '../domain/shared/datetime'
import type { TimeZoneId } from '../domain/shared/types.datetime'
import { enqueueStorageMutation } from './queue'

const CONSENT_STORAGE_KEY = 'fk:v1:persistence-consent'

type ConsentListener = (enabled: boolean) => void
const listeners = new Set<ConsentListener>()

let customStorage: Storage | null | undefined = undefined

export function setCustomStorageForTesting(storage: Storage | null | undefined): void {
  customStorage = storage
}

function getLocalStorage(): Storage | null {
  if (customStorage !== undefined) return customStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage
  } catch {
    // Ignora restrições de ambiente
  }
  return null
}

function readInitialStorageConsent(): boolean {
  try {
    const storage = getLocalStorage()
    if (storage) {
      return storage.getItem(CONSENT_STORAGE_KEY) === 'true'
    }
  } catch {
    // Ignora erro de acesso inicial
  }
  return false
}

let inMemoryConsent: boolean = readInitialStorageConsent()

function notifyListeners(enabled: boolean): void {
  for (const listener of listeners) {
    try {
      listener(enabled)
    } catch {
      // Ignora erros em listeners individuais
    }
  }
}

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
 * Lê o estado atual do consentimento de persistência na sessão ativa.
 * Retorna false por padrão.
 */
export function getPersistenceConsent(): boolean {
  return inMemoryConsent
}

/**
 * Habilita a persistência de dados atomicamente (§10, §11, E6.3).
 * Captura o estado atual em memória, valida todos os orçamentos e invariantes,
 * persiste o snapshot no IndexedDB e só então confirma o consentimento no localStorage.
 */
export async function enablePersistence(): Promise<void> {
  return enqueueStorageMutation(async () => {
    const { enablePersistenceInternal } = await import('./idb')
    await enablePersistenceInternal()

    const storage = getLocalStorage()
    if (storage) {
      try {
        storage.setItem(CONSENT_STORAGE_KEY, 'true')
      } catch (err) {
        throw new Error(`Falha ao gravar consentimento no localStorage: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
      }
    }

    inMemoryConsent = true
    notifyListeners(true)
  })
}

/**
 * Desativa a persistência com purge físico obrigatório e seguro (§10, §11, E6.3).
 * Executa o purge real em todos os stores do IndexedDB antes de persistir a flag false no localStorage.
 */
export async function disablePersistenceAndPurge(): Promise<void> {
  return enqueueStorageMutation(async () => {
    const { purgePersistentData } = await import('./idb')
    await purgePersistentData()

    const storage = getLocalStorage()
    if (storage) {
      try {
        storage.setItem(CONSENT_STORAGE_KEY, 'false')
      } catch (err) {
        throw new Error(`Falha ao gravar revogação de consentimento no localStorage: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
      }
    }

    inMemoryConsent = false
    notifyListeners(false)
  })
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
 * Helper interno para testes: altera o consentimento diretamente e grava no localStorage.
 */
export function setPersistenceConsentForTesting(enabled: boolean): void {
  inMemoryConsent = enabled
  try {
    const storage = getLocalStorage()
    if (storage) {
      storage.setItem(CONSENT_STORAGE_KEY, enabled ? 'true' : 'false')
    }
  } catch {
    // Ignora em ambiente de teste simulado
  }
  notifyListeners(enabled)
}

/**
 * Alias retrocompatível exclusivo para arquivos de teste.
 * NÃO exportado no barrel público src/storage/index.ts.
 */
export const setPersistenceConsent = setPersistenceConsentForTesting

/**
 * Helper interno para testes: redefine o estado interno e os listeners.
 */
export function resetPersistenceConsentForTesting(): void {
  inMemoryConsent = false
  customStorage = undefined
  listeners.clear()
  try {
    const storage = getLocalStorage()
    if (storage) {
      storage.removeItem(CONSENT_STORAGE_KEY)
    }
  } catch {
    // Ignora
  }
}
