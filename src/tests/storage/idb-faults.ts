import { DB_NAME, DB_VERSION, type StoreName } from '../../storage/idb'

type MutatingOperation = 'put' | 'delete' | 'clear'

export interface IDBFault {
  kind: 'request-error' | 'transaction-abort'
  operation: MutatingOperation
  store?: StoreName
  duplicateValue?: unknown
}

export interface FaultController {
  factory: IDBFactory
  arm(fault: IDBFault): void
  disarm(): void
}

export function createFaultController(base: IDBFactory): FaultController {
  let armed: IDBFault | null = null

  const wrapDatabase = (database: IDBDatabase): IDBDatabase => new Proxy(database, {
    get(target, property) {
      if (property !== 'transaction') {
        const value = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      }
      return (...args: Parameters<IDBDatabase['transaction']>) => {
        const transaction = target.transaction(...args)
        const wrapStore = (store: IDBObjectStore): IDBObjectStore => new Proxy(store, {
          get(storeTarget, storeProperty) {
            if (!['put', 'delete', 'clear'].includes(String(storeProperty))) {
              const value = Reflect.get(storeTarget, storeProperty, storeTarget)
              return typeof value === 'function' ? value.bind(storeTarget) : value
            }
            return (...operationArgs: unknown[]) => {
              const operation = storeProperty as MutatingOperation
              const fault = armed
              const matches = fault && fault.operation === operation && (!fault.store || fault.store === storeTarget.name)
              if (!matches) {
                const method = Reflect.get(storeTarget, storeProperty, storeTarget) as (...values: unknown[]) => IDBRequest
                return method.apply(storeTarget, operationArgs)
              }
              armed = null
              if (fault.kind === 'request-error') {
                if (fault.duplicateValue === undefined) throw new Error('request-error requires duplicateValue')
                return storeTarget.add(fault.duplicateValue)
              }
              const method = Reflect.get(storeTarget, storeProperty, storeTarget) as (...values: unknown[]) => IDBRequest
              const request = method.apply(storeTarget, operationArgs)
              request.addEventListener('success', () => transaction.abort(), { once: true })
              return request
            }
          },
        })
        return new Proxy(transaction, {
          get(txTarget, txProperty) {
            if (txProperty === 'objectStore') return (name: string) => wrapStore(txTarget.objectStore(name))
            const value = Reflect.get(txTarget, txProperty, txTarget)
            return typeof value === 'function' ? value.bind(txTarget) : value
          },
        })
      }
    },
  })

  const factory = new Proxy(base, {
    get(target, property) {
      if (property !== 'open') {
        const value = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      }
      return (...args: Parameters<IDBFactory['open']>) => {
        const request = target.open(...args)
        return new Proxy(request, {
          get(requestTarget, requestProperty) {
            if (requestProperty === 'result') return wrapDatabase(requestTarget.result)
            const value = Reflect.get(requestTarget, requestProperty, requestTarget)
            return typeof value === 'function' ? value.bind(requestTarget) : value
          },
          set(requestTarget, requestProperty, value) {
            return Reflect.set(requestTarget, requestProperty, value, requestTarget)
          },
        })
      }
    },
  }) as IDBFactory

  return {
    factory,
    arm(fault) { armed = fault },
    disarm() { armed = null },
  }
}

export async function openRawDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('scenarios')) database.createObjectStore('scenarios', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('protocols')) database.createObjectStore('protocols', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('history')) database.createObjectStore('history', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('custom')) database.createObjectStore('custom', { keyPath: 'key' })
      if (!database.objectStoreNames.contains('quarantine')) database.createObjectStore('quarantine', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readRawStore<T>(factory: IDBFactory, storeName: StoreName): Promise<T[]> {
  const database = await openRawDatabase(factory)
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const request = transaction.objectStore(storeName).getAll()
    transaction.oncomplete = () => { database.close(); resolve(request.result as T[]) }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}
