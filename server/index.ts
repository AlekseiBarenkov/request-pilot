import 'dotenv/config'

import { buildApp } from './app'
import { loadConfig } from './config'

async function main(): Promise<void> {
  const config = loadConfig()
  const app = await buildApp({ config, serveStatic: true })
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    app.log.info({ signal }, 'Останавливаем сервер')
    await app.close()
    process.exit(0)
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  try {
    await app.listen({ port: config.port })
  } catch (error) {
    await app.close()
    throw error
  }

  app.log.info({ port: config.port, provider: config.provider }, 'RequestPilot API запущен')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Не удалось запустить сервер.')
  process.exitCode = 1
})
