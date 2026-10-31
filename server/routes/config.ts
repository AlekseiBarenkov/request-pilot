import type { FastifyInstance } from 'fastify'

import { MAX_TEXT_LENGTH } from '../../shared/constants'
import type { ConfigResponse } from '../../shared/schemas/api'
import type { AppDependencies } from '../dependencies'

export function registerConfigRoute(app: FastifyInstance, dependencies: AppDependencies): void {
  app.get('/api/config', async (_request, reply) => {
    const provider = dependencies.provider.id
    const model = provider === 'deepseek' ? dependencies.config.deepseekModel : provider === 'fake' ? 'fake' : null

    const payload: ConfigResponse = {
      mode: dependencies.mode,
      provider,
      model,
      maxTextLength: MAX_TEXT_LENGTH,
    }

    return reply.send(payload)
  })
}
