import { z } from 'zod'

import type { ProviderId } from '../shared/constants'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  AI_PROVIDER: z.enum(['auto', 'deepseek', 'demo', 'fake']).default('auto'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().min(1).default('deepseek-flash'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(8000).default(2000),
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().nonnegative().default(100),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
  MAX_CONCURRENT_AI_REQUESTS: z.coerce.number().int().positive().default(3),
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
})

export type NodeEnv = 'development' | 'test' | 'production'
export type ProviderSetting = 'auto' | 'deepseek' | 'demo' | 'fake'

export type ServerConfig = {
  nodeEnv: NodeEnv
  port: number
  aiProvider: ProviderSetting
  provider: ProviderId
  deepseekApiKey: string | null
  deepseekBaseUrl: string
  deepseekModel: string
  requestTimeoutMs: number
  maxOutputTokens: number
  dailyRequestLimit: number
  rateLimitPerMinute: number
  maxConcurrentRequests: number
  trustProxy: boolean
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = EnvSchema.safeParse(env)

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`).join('; ')
    throw new Error(`Некорректные переменные окружения: ${details}`)
  }

  const values = parsed.data
  const rawApiKey = values.DEEPSEEK_API_KEY?.trim() ?? ''
  const apiKey = rawApiKey.length > 0 ? rawApiKey : null
  const provider = resolveProvider(values.AI_PROVIDER, apiKey, values.NODE_ENV)

  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    aiProvider: values.AI_PROVIDER,
    provider,
    deepseekApiKey: apiKey,
    deepseekBaseUrl: values.DEEPSEEK_BASE_URL.replace(/\/+$/, ''),
    deepseekModel: values.DEEPSEEK_MODEL,
    requestTimeoutMs: values.AI_REQUEST_TIMEOUT_MS,
    maxOutputTokens: values.AI_MAX_OUTPUT_TOKENS,
    dailyRequestLimit: values.AI_DAILY_REQUEST_LIMIT,
    rateLimitPerMinute: values.RATE_LIMIT_PER_MINUTE,
    maxConcurrentRequests: values.MAX_CONCURRENT_AI_REQUESTS,
    trustProxy: values.TRUST_PROXY === '1',
  }
}

function resolveProvider(setting: ProviderSetting, apiKey: string | null, nodeEnv: NodeEnv): ProviderId {
  if (setting === 'demo') {
    return 'demo'
  }

  if (setting === 'fake') {
    if (nodeEnv === 'production') {
      throw new Error('AI_PROVIDER=fake запрещён в production. Используйте demo или deepseek.')
    }
    return 'fake'
  }

  if (setting === 'deepseek') {
    if (!apiKey) {
      throw new Error(
        'AI_PROVIDER=deepseek требует DEEPSEEK_API_KEY. Добавьте ключ в .env или выберите AI_PROVIDER=demo.',
      )
    }
    return 'deepseek'
  }

  return apiKey ? 'deepseek' : 'demo'
}
