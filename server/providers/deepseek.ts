import OpenAI, { APIConnectionTimeoutError, APIError, APIUserAbortError, AuthenticationError } from 'openai'
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'

import type { ServerConfig } from '../config'
import { AppError, isAppError } from '../errors'
import { buildUserPrompt, SYSTEM_PROMPT } from '../prompt'
import type { AnalysisProvider, ProviderOutput } from './types'

type DeepSeekChatRequest = ChatCompletionCreateParamsNonStreaming & {
  thinking: { type: 'disabled' }
}

const DEEPSEEK_TEMPERATURE = 0.2

export function createDeepSeekProvider(config: ServerConfig): AnalysisProvider {
  const apiKey = config.deepseekApiKey

  if (!apiKey) {
    throw new Error('Для провайдера DeepSeek нужен DEEPSEEK_API_KEY.')
  }

  const client = new OpenAI({
    apiKey,
    baseURL: config.deepseekBaseUrl,
    timeout: config.requestTimeoutMs,
    maxRetries: 0,
  })

  return {
    id: 'deepseek',
    async analyze(text: string, signal: AbortSignal): Promise<ProviderOutput> {
      const request: DeepSeekChatRequest = {
        model: config.deepseekModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(text) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: config.maxOutputTokens,
        temperature: DEEPSEEK_TEMPERATURE,
        stream: false,
        thinking: { type: 'disabled' },
      }

      try {
        const completion = await client.chat.completions.create(request, { signal })
        return readCompletion(completion, config.deepseekModel)
      } catch (error) {
        throw toProviderError(error, signal)
      }
    },
  }
}

function readCompletion(completion: ChatCompletion, fallbackModel: string): ProviderOutput {
  const choice = completion.choices[0]

  if (!choice || choice.finish_reason === 'length') {
    throw new AppError('INVALID_MODEL_RESPONSE')
  }

  const content = choice.message.content

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AppError('INVALID_MODEL_RESPONSE')
  }

  return {
    raw: parseContent(content),
    model: completion.model.length > 0 ? completion.model : fallbackModel,
  }
}

function parseContent(content: string): unknown {
  const trimmed = content.trim()
  const fenced = /^```json\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  const jsonText = fenced?.[1]?.trim() ?? trimmed

  try {
    return JSON.parse(jsonText) as unknown
  } catch {
    throw new AppError('INVALID_MODEL_RESPONSE')
  }
}

function toProviderError(error: unknown, signal: AbortSignal): Error {
  if (isAppError(error)) {
    return error
  }

  if (signal.aborted || error instanceof APIUserAbortError) {
    return createAbortError()
  }

  if (error instanceof APIConnectionTimeoutError) {
    return new AppError('PROVIDER_TIMEOUT')
  }

  if (error instanceof AuthenticationError) {
    return new AppError('PROVIDER_AUTH')
  }

  if (error instanceof APIError) {
    if (error.status === 402) {
      return new AppError('PROVIDER_BILLING')
    }

    if (error.status === 401) {
      return new AppError('PROVIDER_AUTH')
    }

    return new AppError('PROVIDER_UNAVAILABLE')
  }

  return new AppError('PROVIDER_UNAVAILABLE')
}

function createAbortError(): Error {
  const error = new Error('Запрос отменён')
  error.name = 'AbortError'
  return error
}
