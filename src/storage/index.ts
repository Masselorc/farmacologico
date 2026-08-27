// API pública e segura da camada de persistência, histórico, orçamentos e quarentena (§6, §10, §11, §12, E6.3).
// Funções low-level e test hooks são intencionalmente omitidos deste barrel público.

export {
  serializedUtf8Bytes,
  truncateUtf8Bytes,
} from './bytes'

export {
  detectInitialCalendarTimeZone,
  disablePersistenceAndPurge,
  enablePersistence,
  getPersistenceConsent,
  subscribePersistenceConsent,
} from './consent'

export {
  getLastStorageError,
  getStorageMode,
  hasUnsyncedChanges,
  isStorageDegraded,
  retryStorageOpen,
} from './idb'

export {
  loadConfigPayload,
  mutateConfigPayload,
  validateProjectedConfigPayload,
  type ConfigMutationResult,
} from './config'


export {
  addCalculationRecord,
  calculateProjectedFullBackupBytes,
  deleteCalculationRecord,
  getCalculationRecordById,
  getCalculationRecords,
  type AddCalculationRecordResult,
} from './history'

export {
  addQuarantineItem,
  clearQuarantine,
  deleteQuarantineItem,
  getQuarantineItems,
  type AddQuarantineOptions,
  type AddQuarantineResult,
} from './quarantine'

export {
  buildConfigExport,
  buildFullBackup,
  exportCurrentConfig,
  exportCurrentFullBackup,
  type ExportResult,
} from './export'


export {
  applyImport,
  validateAndPreviewConfigImport,
  validateAndPreviewFullBackupImport,
} from './import'

export {
  validateConfigReferences,
  type ConfigReferenceValidationResult,
} from './references'

export {
  validateCalculationRecordRuntime,
  validateHistoricalInvariants,
  type HistoricalValidationResult,
} from './history-validation'
