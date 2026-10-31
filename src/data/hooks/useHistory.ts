import { useCallback, useEffect, useState } from 'react'

import type { SavedAnalysis } from '../../../shared/schemas/saved'
import { listAnalyses } from '../storage/analysesRepo'
import { StorageCorruptError, StorageUnavailableError } from '../storage/errors'

export type HistoryStatus = 'loading' | 'ready' | 'corrupt' | 'unavailable' | 'error'

export type HistoryState = {
  status: HistoryStatus
  analyses: SavedAnalysis[]
  error: string | null
  reload: () => void
}

export function useHistory(): HistoryState {
  const [revision, setRevision] = useState(0)
  const [status, setStatus] = useState<HistoryStatus>('loading')
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    setStatus('loading')
    setError(null)

    listAnalyses()
      .then((items) => {
        if (!active) {
          return
        }

        setAnalyses(items)
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }

        if (reason instanceof StorageCorruptError) {
          setStatus('corrupt')
          setError(reason.message)
          return
        }

        if (reason instanceof StorageUnavailableError) {
          setStatus('unavailable')
          setError(reason.message)
          return
        }

        setStatus('error')
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить историю.')
      })

    return () => {
      active = false
    }
  }, [revision])

  const reload = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  return { status, analyses, error, reload }
}
