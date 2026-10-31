import type { ProviderId } from '../../shared/constants'

export type ProviderOutput = {
  raw: unknown
  model: string | null
}

export type AnalysisProvider = {
  id: ProviderId
  analyze(text: string, signal: AbortSignal): Promise<ProviderOutput>
}
