import { MAX_TEXT_LENGTH } from '../shared/constants'
import type { ApiErrorCode } from '../shared/schemas/api'

const ERROR_STATUS: Record<ApiErrorCode, number> = {
  TEXT_REQUIRED: 400,
  INVALID_REQUEST: 400,
  TEXT_TOO_LONG: 413,
  DEMO_EXAMPLE_REQUIRED: 422,
  RATE_LIMITED: 429,
  DAILY_LIMIT_REACHED: 429,
  SERVER_BUSY: 429,
  PROVIDER_AUTH: 502,
  PROVIDER_BILLING: 502,
  PROVIDER_UNAVAILABLE: 502,
  PROVIDER_TIMEOUT: 504,
  INVALID_MODEL_RESPONSE: 502,
  INTERNAL: 500,
}

export const DEFAULT_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  TEXT_REQUIRED: 'Введите текст обращения.',
  INVALID_REQUEST: 'Некорректный запрос.',
  TEXT_TOO_LONG: `Текст длиннее ${MAX_TEXT_LENGTH} символов.`,
  DEMO_EXAMPLE_REQUIRED:
    'В демо-режиме можно разобрать только подготовленный пример. Выберите пример из списка или подключите DeepSeek.',
  RATE_LIMITED: 'Слишком много запросов. Попробуйте через минуту.',
  DAILY_LIMIT_REACHED: 'Лимит запросов на сегодня исчерпан.',
  SERVER_BUSY: 'Сервер занят. Попробуйте немного позже.',
  PROVIDER_AUTH: 'Провайдер отклонил ключ доступа. Проверьте настройки сервера.',
  PROVIDER_BILLING: 'У провайдера закончился баланс. Разбор временно недоступен.',
  PROVIDER_UNAVAILABLE: 'Провайдер временно недоступен. Попробуйте ещё раз.',
  PROVIDER_TIMEOUT: 'Провайдер не ответил вовремя. Попробуйте ещё раз.',
  INVALID_MODEL_RESPONSE: 'Модель вернула некорректный ответ. Попробуйте ещё раз.',
  INTERNAL: 'Внутренняя ошибка сервера. Попробуйте позже.',
}

export type AppErrorOptions = {
  message?: string
  retryAfterSeconds?: number
}

export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly statusCode: number
  readonly retryAfterSeconds: number | null

  constructor(code: ApiErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? DEFAULT_ERROR_MESSAGES[code])
    this.name = 'AppError'
    this.code = code
    this.statusCode = ERROR_STATUS[code]
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
