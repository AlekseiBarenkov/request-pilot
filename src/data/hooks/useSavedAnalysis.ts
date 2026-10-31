import { useEffect, useState } from 'react'

import type { SavedAnalysis } from '../../../shared/schemas/saved'
import { getAnalysis } from '../storage/analysesRepo'
import { StorageCorruptError, StorageUnavailableError } from '../storage/errors'

export type SavedAnalysisStatus = 'loading' | 'ready' | 'not-found' | 'error'

export type SavedAnalysisState = {
  status: SavedAnalysisStatus
  record: SavedAnalysis | null
  error: string | null
}

export function useSavedAnalysis(id: string | undefined): SavedAnalysisState {
  const [status, setStatus] = useState<SavedAnalysisStatus>('loading')
  const [record, setRecord] = useState<SavedAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (id === undefined) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setError(null)

    getAnalysis(id)
      .then((value) => {
        if (!active) {
          return
        }

        if (value === null) {
          setRecord(null)
          setStatus('not-found')
          return
        }

        setRecord(value)
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }

        if (reason instanceof StorageCorruptError || reason instanceof StorageUnavailableError) {
          setError(reason.message)
        } else {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить разбор.')
        }

        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [id])

  return { status, record, error }
}
