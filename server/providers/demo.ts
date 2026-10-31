import { DEMO_EXAMPLES } from '../../shared/examples'
import { normalizeForMatch } from '../../shared/normalize'
import { AppError } from '../errors'
import type { AnalysisProvider } from './types'

export function createDemoProvider(): AnalysisProvider {
  return {
    id: 'demo',
    async analyze(text: string): Promise<{ raw: unknown; model: string | null }> {
      const normalizedText = normalizeForMatch(text)
      const example = DEMO_EXAMPLES.find((item) => normalizeForMatch(item.text) === normalizedText)

      if (!example) {
        throw new AppError('DEMO_EXAMPLE_REQUIRED')
      }

      return { raw: example.analysis, model: null }
    },
  }
}
