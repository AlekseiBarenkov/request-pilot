import type { ApiErrorCode } from '../../shared/schemas/api'

export type ClientErrorCode = ApiErrorCode | 'NETWORK' | 'CANCELED' | 'INVALID_RESPONSE'

export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number | null

  constructor(code: ClientErrorCode, message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function isAbortError(value: unknown): boolean {
  if (value instanceof Error) {
    return value.name === 'AbortError'
  }

  return typeof value === 'object' && value !== null && 'name' in value && value.name === 'AbortError'
}

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK') {
      return 'Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.'
    }

    if (error.code === 'INVALID_RESPONSE') {
      return 'Сервер вернул неожиданный ответ. Попробуйте ещё раз.'
    }

    return error.message
  }

  return 'Что-то пошло не так. Попробуйте ещё раз.'
}
