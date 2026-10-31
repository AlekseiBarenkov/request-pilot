import type { FastifyInstance } from 'fastify'

import { MAX_TEXT_LENGTH } from '../../shared/constants'
import { AnalyzeRequestSchema } from '../../shared/schemas/api'
import type { AppDependencies } from '../dependencies'
import { AppError } from '../errors'
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

      return await reply.send(result)
    } finally {
      reply.raw.off('close', onClose)
    }
  })
}
