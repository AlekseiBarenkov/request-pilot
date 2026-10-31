import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { ConfigResponse } from '../../shared/schemas/api'
import { ConfigContext } from '../data/hooks/useConfig'
import type { ConfigState } from '../data/hooks/useConfig'
import { fetchConfig } from '../lib/api'
import { isAbortError, toUserMessage } from '../lib/errors'

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<ConfigState['status']>('loading')
  const [config, setConfig] = useState<ConfigResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    setStatus('loading')
    setError(null)

    fetchConfig(controller.signal)
      .then((value) => {
        setConfig(value)
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) {
          return
        }

        setConfig(null)
        setError(toUserMessage(reason))
        setStatus('error')
      })

    return () => {
      controller.abort()
    }
  }, [attempt])

  const retry = useCallback(() => {
    setAttempt((value) => value + 1)
  }, [])

  const value = useMemo<ConfigState>(
    () => ({
      status,
      config,
      error,
      retry,
    }),
    [status, config, error, retry],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}
