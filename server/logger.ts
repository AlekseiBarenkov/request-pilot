import type { FastifyServerOptions } from 'fastify'

import type { ServerConfig } from './config'

export function createLoggerOptions(config: ServerConfig): FastifyServerOptions['logger'] {
  if (config.nodeEnv === 'test') {
    return false
  }

  return {
    level: 'info',
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[скрыто]',
    },
  }
}
