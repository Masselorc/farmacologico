import { describe, expect, it } from 'vitest'
import * as PublicStorageAPI from '../../storage/index'

describe('Public Storage API Boundary & Encapsulation (§11, §12, E6.3)', () => {
  it('garante que métodos low-level e de mutação raw não estão exportados no barrel público', () => {
    const rawCrudMethods = [
      'commitStorageOperations',
      'putToStore',
      'deleteFromStore',
      'clearStore',
      'clearAllStores',
      'purgePersistentData',
      'saveConfigPayload',
      'replaceConfigAndPruneHistory',
      'restoreFullBackup',
      'disablePersistenceAndClear',
    ]

    for (const method of rawCrudMethods) {
      expect(PublicStorageAPI, `O barrel público não deve exportar ${method}`).not.toHaveProperty(method)
    }
  })

  it('garante que test hooks e mocks não estão exportados no barrel público de produção', () => {
    const testHooks = [
      'setCustomIDBFactoryForTesting',
      'simulateIDBFailure',
      'resetStorageForTesting',
      'resetStorageSessionForTesting',
      'setPersistenceConsentForTesting',
      'resetPersistenceConsentForTesting',
    ]

    for (const hook of testHooks) {
      expect(PublicStorageAPI, `O barrel público não deve exportar o hook ${hook}`).not.toHaveProperty(hook)
    }
  })

  it('garante que as APIs de produto seguras estão exportadas', () => {
    const productApis = [
      'enablePersistence',
      'disablePersistenceAndPurge',
      'getPersistenceConsent',
      'subscribePersistenceConsent',
      'detectInitialCalendarTimeZone',
      'loadConfigPayload',
      'mutateConfigPayload',
      'validateProjectedConfigPayload',
      'addCalculationRecord',
      'getCalculationRecords',
      'getCalculationRecordById',
      'deleteCalculationRecord',
      'getQuarantineItems',
      'clearQuarantine',
      'deleteQuarantineItem',
      'addQuarantineItem',
      'exportCurrentConfig',
      'exportCurrentFullBackup',
      'buildConfigExport',
      'buildFullBackup',

      'applyImport',
      'validateAndPreviewConfigImport',
      'validateAndPreviewFullBackupImport',
      'validateConfigReferences',
      'validateCalculationRecordRuntime',
      'validateHistoricalInvariants',
      'getStorageMode',
      'isStorageDegraded',
      'getLastStorageError',
      'hasUnsyncedChanges',
      'retryStorageOpen',
    ]

    for (const api of productApis) {
      expect(PublicStorageAPI, `O barrel público deve exportar a API ${api}`).toHaveProperty(api)
    }
  })
})
