import { ANALYSIS_MODE } from '../../shared/constants'
import type { AnalysisMode, ProviderId } from '../../shared/constants'
import { DEMO_EXAMPLES } from '../../shared/examples'
import { normalizeForMatch } from '../../shared/normalize'
import { ModelAnalysisSchema } from '../../shared/schemas/model'
import type { Analysis } from '../../shared/schemas/analysis'
import { AppError } from '../errors'
import type { AnalysisProvider } from '../providers/types'
import { finalizeAnalysis } from './finalize'

export type AnalyzeOutcome = {
  mode: AnalysisMode
  provider: ProviderId
  model: string | null
  analysis: Analysis
}

export type AnalyzeInput = {
  text: string
  provider: AnalysisProvider
  signal: AbortSignal
}

export function modeForProvider(provider: ProviderId): AnalysisMode {
  return provider === 'demo' ? ANALYSIS_MODE.demo : ANALYSIS_MODE.live
}

export async function analyzeText(input: AnalyzeInput): Promise<AnalyzeOutcome> {
  const output = await input.provider.analyze(input.text, input.signal)
  const parsed = ModelAnalysisSchema.safeParse(output.raw)

  if (!parsed.success) {
    throw new AppError('INVALID_MODEL_RESPONSE')
  }

  let analysis: Analysis

  try {
    analysis = finalizeAnalysis(parsed.data, input.text)
  } catch {
    throw new AppError('INVALID_MODEL_RESPONSE')
  }

  return {
    mode: modeForProvider(input.provider.id),
    provider: input.provider.id,
    model: output.model,
    analysis,
  }
}

export function validateDemoCatalog(): void {
  for (const example of DEMO_EXAMPLES) {
    const parsed = ModelAnalysisSchema.safeParse(example.analysis)

    if (!parsed.success) {
      throw new Error(`Демонстрационный пример "${example.title}" не соответствует схеме ответа модели.`)
    }

    if (normalizeForMatch(example.text).length === 0) {
      throw new Error(`Демонстрационный пример "${example.title}" содержит пустой текст.`)
    }

    let analysis: Analysis

    try {
      analysis = finalizeAnalysis(parsed.data, example.text)
    } catch {
      throw new Error(`Демонстрационный пример "${example.title}" не проходит финализацию.`)
    }

    const evidence = [
      analysis.category.evidence,
      analysis.customer.name.evidence,
      analysis.customer.phone.evidence,
      analysis.customer.address.evidence,
      analysis.urgency.evidence,
    ]

    if (evidence.some((item) => item !== null && !item.verified)) {
      throw new Error(`Демонстрационный пример "${example.title}" содержит цитату, которой нет в тексте.`)
    }

    if (analysis.urgency.value === 'urgent' && analysis.urgency.evidence?.verified !== true) {
      throw new Error(`Демонстрационный пример "${example.title}" помечен срочным без подтверждающей цитаты.`)
    }
  }
}
