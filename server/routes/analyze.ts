import type { FastifyInstance } from 'fastify'

import { MAX_TEXT_LENGTH } from '../../shared/constants'
import { AnalyzeRequestSchema } from '../../shared/schemas/api'
import type { AnalyzeResponse } from '../../shared/schemas/api'
import type { AppDependencies } from '../dependencies'
import { AppError, isAppError } from '../errors'
import { analyzeText } from '../services/analyze'

export function registerAnalyzeRoute(app: FastifyInstance, dependencies: AppDependencies): void {
  app.post('/api/analyze', async (request, reply) => {
    const parsed = AnalyzeRequestSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('INVALID_REQUEST')
    }

    const text = parsed.data.text.trim()

    if (text.length === 0) {
      throw new AppError('TEXT_REQUIRED')
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new AppError('TEXT_TOO_LONG')
    }

    const startedAt = Date.now()
    let releaseLimit: (() => void) | null = null

    try {
      if (dependencies.provider.id === 'deepseek') {
        releaseLimit = dependencies.limiter.acquire(request.ip).release
      }

      const controller = new AbortController()
      const onClose = () => {
        if (!reply.raw.writableEnded) {
          controller.abort()
        }
      }

      reply.raw.on('close', onClose)

      try {
        const result = await analyzeText({
          text,
          provider: dependencies.provider,
          signal: controller.signal,
        })

        const payload: AnalyzeResponse = {
          mode: result.mode,
          provider: result.provider,
          model: result.model,
          analysis: result.analysis,
        }

        request.log.info(
          {
            route: '/api/analyze',
            mode: result.mode,
            provider: result.provider,
            model: result.model,
            textLength: text.length,
            status: 200,
            durationMs: Date.now() - startedAt,
            promptTokens: result.usage?.promptTokens ?? null,
            completionTokens: result.usage?.completionTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
          },
          'Разбор завершён',
        )

        return await reply.send(payload)
      } finally {
        reply.raw.off('close', onClose)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return reply
      }

      if (isAppError(error)) {
        request.log.warn(
          {
            route: '/api/analyze',
            mode: dependencies.mode,
            provider: dependencies.provider.id,
            textLength: text.length,
            status: error.statusCode,
            code: error.code,
            durationMs: Date.now() - startedAt,
          },
          'Разбор завершён с ошибкой',
        )
      }

      throw error
    } finally {
      releaseLimit?.()
    }
  })
}
