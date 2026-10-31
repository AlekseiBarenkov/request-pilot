import { z } from 'zod'

import { HISTORY_LIMIT, SCHEMA_VERSION } from '../constants'
import { AnalysisSchema } from './analysis'
import { AnalysisModeSchema, ProviderSchema } from './common'

export const SavedAnalysisSchema = z.strictObject({
  id: z.string().min(1),
  mode: AnalysisModeSchema,
  provider: ProviderSchema,
  model: z.string().nullable(),
  sourceText: z.string().min(1),
  createdAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime(),
  modelAnalysis: AnalysisSchema,
  analysis: AnalysisSchema,
})

export type SavedAnalysis = z.infer<typeof SavedAnalysisSchema>

export const StoredStateSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  analyses: z.array(SavedAnalysisSchema).max(HISTORY_LIMIT),
})

export type StoredState = z.infer<typeof StoredStateSchema>
