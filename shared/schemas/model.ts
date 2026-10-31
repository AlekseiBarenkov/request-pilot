import { z } from 'zod'

import { MAX_LIST_ITEMS } from '../constants'
import { CategorySchema, RequestTypeSchema, UrgencySchema } from './common'

export const ModelAnalysisSchema = z.strictObject({
  summary: z.string().trim().min(1).max(600),
  category: CategorySchema.nullable(),
  categoryEvidence: z.string().trim().max(600).nullable(),
  requestType: RequestTypeSchema,
  customerName: z.string().trim().max(120).nullable(),
  customerNameEvidence: z.string().trim().max(600).nullable(),
  phone: z.string().trim().max(60).nullable(),
  phoneEvidence: z.string().trim().max(600).nullable(),
  address: z.string().trim().max(300).nullable(),
  addressEvidence: z.string().trim().max(600).nullable(),
  problem: z.string().trim().max(1000).nullable(),
  urgency: UrgencySchema,
  urgencyEvidence: z.string().trim().max(600).nullable(),
  missing: z.array(z.string().trim().max(300)).max(MAX_LIST_ITEMS),
  questions: z.array(z.string().trim().max(300)).max(MAX_LIST_ITEMS),
  draftReply: z.string().trim().min(1).max(3000),
})

export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>
