import 'dotenv/config'

import { DEMO_EXAMPLES } from '../shared/examples'
import { loadConfig } from '../server/config'
import { isAppError } from '../server/errors'
import { createProvider } from '../server/providers/registry'
import { analyzeText } from '../server/services/analyze'

async function main(): Promise<void> {
  const config = loadConfig()

  if (config.provider !== 'deepseek') {
    process.stderr.write(
      'DeepSeek не настроен. Добавьте DEEPSEEK_API_KEY в .env или запустите приложение в демо-режиме.\n',
    )
    process.exitCode = 1
    return
  }

  const example = DEMO_EXAMPLES[0]

  if (!example) {
    throw new Error('Демонстрационный пример не найден.')
  }

  const provider = createProvider(config)
  const controller = new AbortController()
  const result = await analyzeText({
    text: example.text,
    provider,
    signal: controller.signal,
  })

  process.stdout.write(
    `${JSON.stringify(
      {
        mode: result.mode,
        provider: result.provider,
        model: result.model,
        summary: result.analysis.summary,
        category: result.analysis.category.value,
        requestType: result.analysis.requestType,
        urgency: result.analysis.urgency.value,
        missing: result.analysis.missing,
        draftReply: result.analysis.draftReply,
      },
      null,
      2,
    )}\n`,
  )
}

main().catch((error: unknown) => {
  if (isAppError(error)) {
    process.stderr.write(`${error.code}: ${error.message}\n`)
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : 'Не удалось выполнить smoke-запуск.'}\n`)
  }

  process.exitCode = 1
})
