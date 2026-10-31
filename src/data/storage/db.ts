import { STORAGE_DB_NAME, STORAGE_STORE_NAME } from '../../../shared/constants'
import { StorageUnavailableError } from './errors'

const DB_VERSION = 1

let databasePromise: Promise<IDBDatabase> | null = null

export function getDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new StorageUnavailableError())
  }

  if (databasePromise === null) {
    databasePromise = openDatabase().catch((error: unknown) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

export function closeDatabase(): void {
  if (databasePromise !== null) {
    void databasePromise.then((database) => database.close()).catch(() => undefined)
    databasePromise = null
  }
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new StorageUnavailableError())
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new StorageUnavailableError())
    transaction.onabort = () => reject(transaction.error ?? new StorageUnavailableError())
  })
}

export function deleteDatabase(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new StorageUnavailableError())
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(STORAGE_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new StorageUnavailableError())
    request.onblocked = () =>
      reject(new StorageUnavailableError('Не удалось сбросить историю: закройте другие вкладки приложения.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest

    try {
      request = indexedDB.open(STORAGE_DB_NAME, DB_VERSION)
    } catch {
      reject(new StorageUnavailableError())
      return
    }

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORAGE_STORE_NAME)) {
        database.createObjectStore(STORAGE_STORE_NAME)
      }
    }

    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        databasePromise = null
      }
      resolve(database)
    }

    request.onerror = () => reject(new StorageUnavailableError())
    request.onblocked = () =>
      reject(new StorageUnavailableError('Хранилище занято другой вкладкой. Закройте её и попробуйте снова.'))
  })
}
