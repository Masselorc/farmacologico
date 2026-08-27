// Utilitários, mocks e hooks de teste isolados para testes unitários e de integração (§12, E6.4).
// Este módulo NÃO é exportado pelo barrel público src/storage/index.ts e não entra no bundle final de produção.

export {
  resetPersistenceConsentForTesting,
  setCustomStorageForTesting,
  setPersistenceConsentForTesting,
} from './consent'

export {
  clearAllStores,
  clearStore,
  commitStorageOperations,
  commitStorageOperationsUnlocked,
  deleteFromStore,
  getDefaultFavorites,
  getDefaultSettings,
  purgePersistentData,
  purgePhysicalIDBOnly,
  putToStore,
  replaceConfigAndPruneHistory,
  resetStorageForTesting,
  resetStorageSessionForTesting,
  restoreFullBackup,
  saveConfigPayload,
  setCustomIDBFactoryForTesting,
  simulateIDBFailure,
  type StoredQuarantineEntry,
} from './idb'

export {
  addQuarantineItemUnlocked,
} from './quarantine'
