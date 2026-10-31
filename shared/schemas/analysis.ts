import { z } from 'zod'

import { CategorySchema, EvidenceSchema, RequestTypeSchema, UrgencySchema, fieldSchema } from './common'

export type Evidence = {
  snippet: string
  verified: boolean
}

export type Field<T> = {
  value: T | null
  evidence: Evidence | null
}

export type RequiredField<T> = {
  value: T
  evidence: Evidence | null
}

export const AnalysisSchema = z.strictObject({
  summary: z.string().min(1),
  category: fieldSchema(CategorySchema),
  requestType: RequestTypeSchema,
  customer: z.strictObject({
    name: fieldSchema(z.string()),
    phone: fieldSchema(z.string()),
    address: fieldSchema(z.string()),
  }),
  problem: z.string().nullable(),
  urgency: z.strictObject({
    value: UrgencySchema,
    evidence: EvidenceSchema.nullable(),
  }),
  missing: z.array(z.string().min(1)).max(10),
  questions: z.array(z.string().min(1)).max(10),
  draftReply: z.string().min(1),
})

export type Analysis = z.infer<typeof AnalysisSchema>
