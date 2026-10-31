import type { ServerConfig } from '../config'
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

  throw new Error(
    'Провайдер DeepSeek не подключён в этой версии приложения. Для запуска без ключа используйте AI_PROVIDER=demo.',
  )
}
