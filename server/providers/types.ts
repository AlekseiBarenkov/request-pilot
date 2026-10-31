import type { ProviderId } from '../../shared/constants'

export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type ProviderOutput = {
  raw: unknown
  model: string | null
  usage?: TokenUsage
}

export type AnalysisProvider = {
  id: ProviderId
  analyze(text: string, signal: AbortSignal): Promise<ProviderOutput>
}
