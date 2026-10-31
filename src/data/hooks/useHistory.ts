import { useCallback, useEffect, useRef, useState } from 'react'

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
  const silentRefreshRef = useRef(false)
  const lastFocusRefreshRef = useRef(0)

  useEffect(() => {
    let active = true
    const silent = silentRefreshRef.current
    silentRefreshRef.current = false

    if (!silent) {
      setStatus('loading')
      setError(null)
    }

    listAnalyses()
      .then((items) => {
        if (!active) {
          return
        }

        setAnalyses(items)
        setStatus('ready')
        setError(null)
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

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') {
        return
      }

      const now = Date.now()

      if (now - lastFocusRefreshRef.current < 500) {
        return
      }

      lastFocusRefreshRef.current = now
      silentRefreshRef.current = true
      setRevision((value) => value + 1)
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const reload = useCallback(() => {
    silentRefreshRef.current = false
    setRevision((value) => value + 1)
  }, [])

  return { status, analyses, error, reload }
}
