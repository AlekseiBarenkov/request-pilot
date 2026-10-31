import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ApiErrorResponse } from '../shared/schemas/api'

const DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url))

export async function registerStatic(app: FastifyInstance, enabled: boolean): Promise<void> {
  const indexPath = join(DIST_DIR, 'index.html')
  const hasClientBuild = existsSync(indexPath)

  if (enabled && hasClientBuild) {
    await app.register(fastifyStatic, {
      root: DIST_DIR,
      wildcard: false,
      index: false,
    })

    app.setNotFoundHandler((request, reply) => {
      const pathname = request.url.split('?')[0] ?? ''

      if (pathname === '/api' || pathname.startsWith('/api/')) {
        return reply.status(404).send(notFoundPayload())
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return reply.status(404).send(notFoundPayload())
      }

      if (pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(pathname)) {
        return reply.status(404).send(notFoundPayload())
      }

      return reply.sendFile('index.html')
    })

    return
  }

  app.setNotFoundHandler((_request, reply) => reply.status(404).send(notFoundPayload()))
}

function notFoundPayload(): ApiErrorResponse {
  return {
    error: {
      code: 'INVALID_REQUEST',
      message: 'Маршрут не найден.',
    },
  }
}
