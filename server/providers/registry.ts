import type { ServerConfig } from '../config'
import { createDeepSeekProvider } from './deepseek'
import { createDemoProvider } from './demo'
import { createFakeProvider } from './fake'
import type { AnalysisProvider } from './types'

export function createProvider(config: ServerConfig): AnalysisProvider {
  if (config.provider === 'demo') {
    return createDemoProvider()
  }

  if (config.provider === 'fake') {
    return createFakeProvider()
  }

  return createDeepSeekProvider(config)
}
