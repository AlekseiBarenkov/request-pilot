import { HISTORY_LIMIT, SCHEMA_VERSION, STORAGE_CURRENT_KEY, STORAGE_STORE_NAME } from '../../../shared/constants'
import { SavedAnalysisSchema, StoredStateSchema } from '../../../shared/schemas/saved'
import type { SavedAnalysis, StoredState } from '../../../shared/schemas/saved'
import { closeDatabase, deleteDatabase, getDatabase, requestResult, transactionDone } from './db'
import { StorageCorruptError, StorageLimitError } from './errors'

let writeQueue: Promise<unknown> = Promise.resolve()

function emptyState(): StoredState {
  return { schemaVersion: SCHEMA_VERSION, analyses: [] }
}

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task)
  writeQueue = result.catch(() => undefined)
  return result
}

export async function listAnalyses(): Promise<SavedAnalysis[]> {
  const database = await getDatabase()
  const state = await readState(database)

  return [...state.analyses].sort((left, right) => right.confirmedAt.localeCompare(left.confirmedAt))
}

export async function getAnalysis(id: string): Promise<SavedAnalysis | null> {
  const database = await getDatabase()
  const state = await readState(database)

  return state.analyses.find((analysis) => analysis.id === id) ?? null
}

export async function saveAnalysis(input: SavedAnalysis): Promise<SavedAnalysis> {
  const record = SavedAnalysisSchema.parse(input)

  return enqueueWrite(async () => {
    const database = await getDatabase()
    const state = await readState(database)
    const existing = state.analyses.find((analysis) => analysis.id === record.id)

    if (existing) {
      return existing
    }

    if (state.analyses.length >= HISTORY_LIMIT) {
      throw new StorageLimitError()
    }

    await writeState(database, {
      schemaVersion: SCHEMA_VERSION,
      analyses: [record, ...state.analyses],
    })

    return record
  })
}

export async function removeAnalysis(id: string): Promise<void> {
  await enqueueWrite(async () => {
    const database = await getDatabase()
    const state = await readState(database)
    const next = state.analyses.filter((analysis) => analysis.id !== id)

    if (next.length === state.analyses.length) {
      return
    }

    await writeState(database, { schemaVersion: SCHEMA_VERSION, analyses: next })
  })
}

export async function clearAnalyses(): Promise<void> {
  await enqueueWrite(async () => {
    const database = await getDatabase()
    await writeState(database, emptyState())
  })
}

export async function resetStorage(): Promise<void> {
  await enqueueWrite(async () => {
    const database = await getDatabase()
    database.close()
    closeDatabase()
    await deleteDatabase()
  })
}

export async function isStorageAvailable(): Promise<boolean> {
  try {
    await getDatabase()
    return true
  } catch {
    return false
  }
}

async function readState(database: IDBDatabase): Promise<StoredState> {
  const transaction = database.transaction(STORAGE_STORE_NAME, 'readonly')
  const done = transactionDone(transaction)
  const raw = await requestResult<unknown>(transaction.objectStore(STORAGE_STORE_NAME).get(STORAGE_CURRENT_KEY))
  await done

  if (raw === undefined) {
    return emptyState()
  }

  const parsed = StoredStateSchema.safeParse(raw)

  if (!parsed.success) {
    throw new StorageCorruptError()
  }

  return parsed.data
}

async function writeState(database: IDBDatabase, state: StoredState): Promise<void> {
  const transaction = database.transaction(STORAGE_STORE_NAME, 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore(STORAGE_STORE_NAME).put(state, STORAGE_CURRENT_KEY)
  await done
}
