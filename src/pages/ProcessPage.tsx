import { App, Button, Input, Select, Skeleton } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { MAX_TEXT_LENGTH } from '../../shared/constants'
import { DEMO_EXAMPLES } from '../../shared/examples'
import type { AnalyzeResponse } from '../../shared/schemas/api'
import { ErrorNotice } from '../components/ErrorNotice'
import { ModeBadge } from '../components/ModeBadge'
import { useConfig } from '../data/hooks/useConfig'
import { AnalysisPreview } from '../features/processing/AnalysisPreview'
import { analyzeRequest } from '../lib/api'
import { ApiError, isAbortError, toUserMessage } from '../lib/errors'
import type { ClientErrorCode } from '../lib/errors'

type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

type RequestState = {
  status: RequestStatus
  result: AnalyzeResponse | null
  error: string | null
  errorCode: ClientErrorCode | null
}

const INITIAL_REQUEST: RequestState = {
  status: 'idle',
  result: null,
  error: null,
  errorCode: null,
}

export function ProcessPage() {
  const { status: configStatus, config, error: configError, retry: retryConfig } = useConfig()
  const { message } = App.useApp()

  const [text, setText] = useState('')
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [request, setRequest] = useState<RequestState>(INITIAL_REQUEST)
  const [analyzedText, setAnalyzedText] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)

  const maxLength = config?.maxTextLength ?? MAX_TEXT_LENGTH
  const trimmedText = text.trim()
  const isStale = request.status === 'success' && analyzedText !== null && trimmedText !== analyzedText
  const isDemo = config?.mode === 'demo'
  const canAnalyze =
    configStatus === 'ready' &&
    request.status !== 'loading' &&
    trimmedText.length > 0 &&
    trimmedText.length <= maxLength

  useEffect(() => {
    if (request.status === 'success') {
      resultHeadingRef.current?.focus()
    }
  }, [request.status])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      abortRef.current?.abort()
    }
  }, [])

  function handleTextChange(value: string) {
    setText(value)
    setSelectedExampleId(null)
    setFieldError(null)
  }

  function handleExampleChange(value: string) {
    const example = DEMO_EXAMPLES.find((item) => item.id === value)

    if (!example) {
      return
    }

    setText(example.text)
    setSelectedExampleId(example.id)
    setFieldError(null)
  }

  async function handleAnalyze() {
    if (trimmedText.length === 0) {
      setFieldError('Введите текст обращения.')
      return
    }

    if (trimmedText.length > maxLength) {
      setFieldError(`Текст длиннее ${maxLength} символов.`)
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    const generation = generationRef.current + 1
    generationRef.current = generation

    setFieldError(null)
    setRequest({ status: 'loading', result: null, error: null, errorCode: null })

    try {
      const result = await analyzeRequest(trimmedText, controller.signal)

      if (generation !== generationRef.current) {
        return
      }

      setAnalyzedText(trimmedText)
      setRequest({ status: 'success', result, error: null, errorCode: null })
    } catch (error) {
      if (generation !== generationRef.current) {
        return
      }

      if (isAbortError(error) || (error instanceof ApiError && error.code === 'CANCELED')) {
        setRequest(INITIAL_REQUEST)
        return
      }

      setRequest({
        status: 'error',
        result: null,
        error: toUserMessage(error),
        errorCode: error instanceof ApiError ? error.code : null,
      })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  function handleCancel() {
    generationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setRequest(INITIAL_REQUEST)
    message.info('Запрос отменён')
  }

  const announcement =
    request.status === 'loading'
      ? 'Идёт разбор обращения.'
      : request.status === 'success'
        ? 'Разбор готов. Проверьте поля и черновик ответа.'
        : request.status === 'error'
          ? 'Не удалось выполнить разбор. Прочитайте сообщение об ошибке.'
          : ''

  return (
    <div className="page">
      <div className="page-heading">
        <h1>Обработка обращения</h1>
        <p>Вставьте обращение клиента или выберите пример, затем запустите разбор.</p>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className="process-grid">
        <section className="surface surface--source" aria-labelledby="source-heading">
          <div className="surface__header">
            <h2 className="surface__title" id="source-heading">
              Обращение клиента
            </h2>
          </div>

          <div className="surface__body">
            {configStatus === 'error' ? (
              <ErrorNotice
                title="Не удалось получить режим работы"
                message={configError ?? 'Сервер не ответил. Попробуйте ещё раз.'}
                onRetry={retryConfig}
              />
            ) : null}

            <div className="form-field">
              <label className="form-label" htmlFor="source-text">
                Текст обращения
              </label>
              <Input.TextArea
                id="source-text"
                value={text}
                onChange={(event) => handleTextChange(event.target.value)}
                placeholder="Например: стиральная машина не сливает воду, нужен мастер. Укажите телефон и адрес."
                autoSize={{ minRows: 10, maxRows: 18 }}
                maxLength={maxLength}
                showCount
                disabled={request.status === 'loading'}
                status={fieldError ? 'error' : undefined}
                aria-invalid={fieldError !== null}
                aria-describedby={fieldError ? 'source-text-error' : 'source-text-hint'}
              />
              <p className="form-hint" id="source-text-hint">
                Вставьте текст обращения или выберите готовый пример.
              </p>
              {fieldError ? (
                <p className="field-error" id="source-text-error" role="alert">
                  {fieldError}
                </p>
              ) : null}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="example-select">
                Пример обращения
              </label>
              <Select
                id="example-select"
                value={selectedExampleId ?? undefined}
                onChange={handleExampleChange}
                placeholder="Выберите один из восьми примеров"
                disabled={request.status === 'loading'}
                options={DEMO_EXAMPLES.map((example, index) => ({
                  value: example.id,
                  label: `${index + 1}. ${example.title}`,
                }))}
              />
            </div>

            <div className="source-mode">
              {configStatus === 'ready' && config ? (
                <>
                  <ModeBadge provider={config.provider} />
                  <p>
                    {config.mode === 'demo'
                      ? 'Текст отправляется только на собственный сервер и не передаётся провайдеру.'
                      : 'Текст обращения отправляется в DeepSeek.'}
                  </p>
                </>
              ) : configStatus === 'loading' ? (
                <p>Проверяем режим работы.</p>
              ) : (
                <p>Режим работы не определён.</p>
              )}
            </div>

            <p className="source-warning">В публичном демо используйте только вымышленные данные.</p>

            <div className="source-actions">
              {request.status === 'loading' ? (
                <Button size="large" danger onClick={handleCancel}>
                  Отменить
                </Button>
              ) : (
                <Button type="primary" size="large" onClick={() => void handleAnalyze()} disabled={!canAnalyze}>
                  {request.status === 'success' ? 'Разобрать заново' : 'Разобрать обращение'}
                </Button>
              )}
            </div>

            {isDemo ? (
              <p className="form-hint">
                В демо-режиме доступны только примеры. Свой текст можно разобрать после подключения DeepSeek.
              </p>
            ) : null}
          </div>
        </section>

        <section className="surface surface--result" aria-labelledby="result-heading">
          <div className="surface__header">
            <h2 className="surface__title" id="result-heading" tabIndex={-1} ref={resultHeadingRef}>
              Результат разбора
            </h2>
          </div>

          <div className="surface__body">
            {request.status === 'idle' ? <ResultPlaceholder /> : null}

            {request.status === 'loading' ? (
              <div className="result-loading">
                <Skeleton active paragraph={{ rows: 8 }} />
                <p className="muted-text">Идёт разбор обращения...</p>
              </div>
            ) : null}

            {request.status === 'error' ? (
              <div className="result-error">
                <ErrorNotice
                  message={request.error ?? 'Не удалось выполнить разбор.'}
                  onRetry={request.errorCode === 'DEMO_EXAMPLE_REQUIRED' ? undefined : () => void handleAnalyze()}
                />
                {request.errorCode === 'DEMO_EXAMPLE_REQUIRED' ? (
                  <p className="muted-text">
                    Выберите один из восьми примеров в блоке обращения. Свой текст можно разобрать после подключения
                    DeepSeek.
                  </p>
                ) : null}
              </div>
            ) : null}

            {request.status === 'success' && request.result ? (
              <>
                {isStale ? (
                  <div className="notice notice--stale" role="status">
                    Текст изменился после разбора. Разберите обращение заново.
                  </div>
                ) : null}
                <AnalysisPreview result={request.result} />
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

function ResultPlaceholder() {
  return (
    <div className="result-placeholder">
      <p className="result-placeholder__lead">Здесь появится разбор обращения.</p>
      <p>
        После запуска вы увидите краткое содержание, категорию техники, тип обращения, данные клиента, срочность с
        основанием, недостающие сведения, уточняющие вопросы и черновик ответа.
      </p>
      <p className="muted-text">
        Рядом с извлечёнными полями будут показаны подтверждающие цитаты из исходного текста.
      </p>
    </div>
  )
}
