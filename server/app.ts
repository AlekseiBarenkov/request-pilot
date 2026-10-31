import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import type { FastifyError, FastifyInstance } from 'fastify'

import type { ApiErrorResponse } from '../shared/schemas/api'
import type { ServerConfig } from './config'
import type { AppDependencies } from './dependencies'
import { AppError, DEFAULT_ERROR_MESSAGES, isAppError } from './errors'
import { createRequestLimiter } from './limits'
import { createLoggerOptions } from './logger'
import { createProvider } from './providers/registry'
import { registerAnalyzeRoute } from './routes/analyze'
import { registerConfigRoute } from './routes/config'
import { modeForProvider, validateDemoCatalog } from './services/analyze'
import { registerStatic } from './static'

const BODY_LIMIT_BYTES = 64 * 1024

export type BuildAppOptions = {
  config: ServerConfig
  serveStatic?: boolean
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  validateDemoCatalog()

  const provider = createProvider(options.config)
  const dependencies: AppDependencies = {
    config: options.config,
    provider,
    limiter: createRequestLimiter(options.config),
    mode: modeForProvider(provider.id),
  }

  const app = Fastify({
    logger: createLoggerOptions(options.config),
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: options.config.trustProxy,
  })

  if (options.config.nodeEnv === 'production') {
    await app.register(helmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  }

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (isAppError(error)) {
      if (error.retryAfterSeconds !== null) {
        reply.header('Retry-After', String(error.retryAfterSeconds))
      }

      return reply.status(error.statusCode).send(errorPayload(error.code, error.message))
    }

    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.status(413).send(errorPayload('INVALID_REQUEST', 'Тело запроса слишком большое.'))
    }

    if (typeof error.code === 'string' && error.code.startsWith('FST_ERR_CTP_')) {
      return reply.status(400).send(errorPayload('INVALID_REQUEST', 'Некорректный JSON в теле запроса.'))
    }

    request.log.error(
      {
        code: typeof error.code === 'string' ? error.code : 'INTERNAL',
        route: request.url,
        status: 500,
      },
      'Необработанная ошибка',
    )

    return reply.status(500).send(errorPayload('INTERNAL', DEFAULT_ERROR_MESSAGES.INTERNAL))
  })

  registerConfigRoute(app, dependencies)
  registerAnalyzeRoute(app, dependencies)
  await registerStatic(app, options.serveStatic ?? false)

  return app
}

function errorPayload(code: AppError['code'], message: string): ApiErrorResponse {
  return { error: { code, message } }
}
