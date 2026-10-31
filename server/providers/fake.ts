import type { ModelAnalysis } from '../../shared/schemas/model'
import { AppError } from '../errors'
import type { AnalysisProvider } from './types'

const FAKE_DELAY_MS = 2500

export function createFakeProvider(): AnalysisProvider {
  return {
    id: 'fake',
    async analyze(text: string, signal: AbortSignal) {
      if (text.includes('[[fake:error]]')) {
        throw new AppError('PROVIDER_UNAVAILABLE')
      }

      if (text.includes('[[fake:timeout]]')) {
        throw new AppError('PROVIDER_TIMEOUT')
      }

      if (text.includes('[[fake:invalid-json]]')) {
        throw new AppError('INVALID_MODEL_RESPONSE')
      }

      if (text.includes('[[fake:delay]]')) {
        await wait(FAKE_DELAY_MS, signal)
      }

      if (text.includes('[[fake:bad-schema]]')) {
        return { raw: { summary: '', category: 'washing_machine' }, model: 'fake' }
      }

      const analysis = buildFakeAnalysis(text)

      if (text.includes('[[fake:evidence-mismatch]]')) {
        analysis.categoryEvidence = 'фраза, которой нет в обращении'
      }

      return { raw: analysis, model: 'fake' }
    },
  }
}

function buildFakeAnalysis(text: string): ModelAnalysis {
  const problem = text.trim().slice(0, 500)

  return {
    summary: 'Тестовый разбор обращения для автоматических проверок.',
    category: 'washing_machine',
    categoryEvidence: null,
    requestType: 'repair',
    customerName: null,
    customerNameEvidence: null,
    phone: null,
    phoneEvidence: null,
    address: null,
    addressEvidence: null,
    problem: problem ? problem : null,
    urgency: 'normal',
    urgencyEvidence: null,
    missing: ['телефон', 'адрес'],
    questions: ['Укажите контактный телефон.'],
    draftReply:
      'Здравствуйте! Спасибо за обращение. Мы получили описание неисправности. Чтобы оформить заявку, укажите контактный телефон и адрес. Стоимость и возможность ремонта уточним после диагностики.',
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    const onAbort = () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
      reject(createAbortError())
    }

    timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function createAbortError(): Error {
  const error = new Error('Запрос отменён')
  error.name = 'AbortError'
  return error
}
