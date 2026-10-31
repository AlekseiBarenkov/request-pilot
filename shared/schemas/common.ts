import { z } from 'zod'

import { CATEGORY_IDS, PROVIDER_IDS, REQUEST_TYPE_IDS, URGENCY_IDS } from '../constants'

export const CategorySchema = z.enum(CATEGORY_IDS)
export const RequestTypeSchema = z.enum(REQUEST_TYPE_IDS)
export const UrgencySchema = z.enum(URGENCY_IDS)
export const ProviderSchema = z.enum(PROVIDER_IDS)
export const AnalysisModeSchema = z.enum(['demo', 'live'])

export const EvidenceSchema = z.strictObject({
  snippet: z.string().min(1),
  verified: z.boolean(),
})

export function fieldSchema<T>(valueSchema: z.ZodType<T>) {
  return z.strictObject({
    value: valueSchema.nullable(),
    evidence: EvidenceSchema.nullable(),
  })
}
