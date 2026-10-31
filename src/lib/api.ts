import { AnalyzeResponseSchema, ApiErrorResponseSchema, ConfigResponseSchema } from '../../shared/schemas/api'
import type { AnalyzeResponse, ConfigResponse } from '../../shared/schemas/api'
import { ApiError, isAbortError } from './errors'

async function fetchJson(path: string, init: RequestInit): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(path, init)
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError('CANCELED', 'Запрос отменён.')
    }

    throw new ApiError('NETWORK', 'Не удалось связаться с сервером.')
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(payload)

    if (parsed.success) {
      throw new ApiError(parsed.data.error.code, parsed.data.error.message, response.status)
    }

    throw new ApiError('INVALID_RESPONSE', 'Сервер вернул неожиданный ответ.', response.status)
  }

  return payload
}

export async function fetchConfig(signal?: AbortSignal): Promise<ConfigResponse> {
  const payload = await fetchJson('/api/config', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  const parsed = ConfigResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new ApiError('INVALID_RESPONSE', 'Сервер вернул неожиданную конфигурацию.')
  }

  return parsed.data
}

export async function analyzeRequest(text: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const payload = await fetchJson('/api/analyze', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    signal,
  })
  const parsed = AnalyzeResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new ApiError('INVALID_RESPONSE', 'Сервер вернул неожиданный результат разбора.')
  }

  return parsed.data
}
