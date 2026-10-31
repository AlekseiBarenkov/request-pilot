import { createContext, useContext } from 'react'

import type { ConfigResponse } from '../../../shared/schemas/api'

export type ConfigStatus = 'loading' | 'ready' | 'error'

export type ConfigState = {
  status: ConfigStatus
  config: ConfigResponse | null
  error: string | null
  retry: () => void
}

export const ConfigContext = createContext<ConfigState | null>(null)

export function useConfig(): ConfigState {
  const value = useContext(ConfigContext)

  if (value === null) {
    throw new Error('useConfig используется вне ConfigProvider.')
  }

  return value
}
