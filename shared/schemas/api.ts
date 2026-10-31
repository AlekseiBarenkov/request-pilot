import { z } from 'zod'

import { AnalysisSchema } from './analysis'
import { AnalysisModeSchema, ProviderSchema } from './common'

export const API_ERROR_CODES = [
  'TEXT_REQUIRED',
  'INVALID_REQUEST',
  'TEXT_TOO_LONG',
  'DEMO_EXAMPLE_REQUIRED',
  'RATE_LIMITED',
  'DAILY_LIMIT_REACHED',
  'SERVER_BUSY',
  'PROVIDER_AUTH',
  'PROVIDER_BILLING',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
  'INVALID_MODEL_RESPONSE',
  'INTERNAL',
] as const

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES)

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export const ApiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

export const AnalyzeRequestSchema = z.strictObject({
  text: z.string(),
})

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>

export const ConfigResponseSchema = z.strictObject({
  mode: AnalysisModeSchema,
  provider: ProviderSchema,
  model: z.string().nullable(),
  maxTextLength: z.number().int().positive(),
})

export type ConfigResponse = z.infer<typeof ConfigResponseSchema>

export const AnalyzeResponseSchema = z.strictObject({
  mode: AnalysisModeSchema,
  provider: ProviderSchema,
  model: z.string().nullable(),
  analysis: AnalysisSchema,
})

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>
