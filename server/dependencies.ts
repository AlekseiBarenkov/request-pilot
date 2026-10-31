import type { AnalysisMode } from '../shared/constants'
import type { ServerConfig } from './config'
import type { RequestLimiter } from './limits'
import type { AnalysisProvider } from './providers/types'

export type AppDependencies = {
  config: ServerConfig
  provider: AnalysisProvider
  limiter: RequestLimiter
  mode: AnalysisMode
}
