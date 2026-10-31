import { App, Button, Input, Modal, Select, Skeleton } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'

import { MAX_TEXT_LENGTH } from '../../shared/constants'
import { DEMO_EXAMPLES } from '../../shared/examples'
import type { DemoExample } from '../../shared/examples'
import type { Analysis } from '../../shared/schemas/analysis'
import type { AnalyzeResponse } from '../../shared/schemas/api'
import type { SavedAnalysis } from '../../shared/schemas/saved'
import { ErrorNotice } from '../components/ErrorNotice'
import { ModeBadge } from '../components/ModeBadge'
import { useConfig } from '../data/hooks/useConfig'
import { resetStorage, saveAnalysis } from '../data/storage/analysesRepo'
import { StorageCorruptError, StorageLimitError, StorageUnavailableError } from '../data/storage/errors'
import { AnalysisEditor } from '../features/processing/AnalysisEditor'
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
  const { message, modal } = App.useApp()
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [request, setRequest] = useState<RequestState>(INITIAL_REQUEST)
  const [analyzedText, setAnalyzedText] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [analysisVersion, setAnalysisVersion] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveRecoveryAvailable, setSaveRecoveryAvailable] = useState(false)
  const [resultInView, setResultInView] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultSectionRef = useRef<HTMLElement>(null)
  const recordIdRef = useRef<string | null>(null)
  const allowNavigationRef = useRef(false)

  const maxLength = config?.maxTextLength ?? MAX_TEXT_LENGTH
  const trimmedText = text.trim()
  const isStale = request.status === 'success' && analyzedText !== null && trimmedText !== analyzedText
  const hasUnsavedResult = request.status === 'success' && request.result !== null && !saved
  const isDemo = config?.mode === 'demo'
  const canAnalyze =
    configStatus === 'ready' &&
    request.status !== 'loading' &&
    !saving &&
    trimmedText.length > 0 &&
    trimmedText.length <= maxLength

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedResult && !allowNavigationRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (request.status === 'success') {
      const heading = resultHeadingRef.current

      if (heading) {
        if (window.matchMedia('(max-width: 1023px)').matches) {
          heading.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start',
          })
        }

        heading.focus({ preventScroll: true })
      }
    }
  }, [request.status])

  useEffect(() => {
    if (request.status !== 'success') {
      setResultInView(false)
      return
    }

    const section = resultSectionRef.current

    if (!section || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setResultInView(entry?.isIntersecting ?? false)
      },
      { threshold: 0.15 },
    )

    observer.observe(section)

    return () => {
      observer.disconnect()
    }
  }, [request.status])

  useEffect(() => {
    document.body.classList.toggle('app-result-visible', request.status === 'success')

    return () => {
      document.body.classList.remove('app-result-visible')
    }
  }, [request.status])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!hasUnsavedResult) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedResult])

  function resetResult() {
    generationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setRequest(INITIAL_REQUEST)
    setAnalyzedText(null)
    setCreatedAt(null)
    setSaving(false)
    setSaveError(null)
    setSaveRecoveryAvailable(false)
    setSaved(false)
    setAnalysisVersion((value) => value + 1)
    recordIdRef.current = null
    allowNavigationRef.current = false
  }

  function applyExample(example: DemoExample) {
    resetResult()
    setText(example.text)
    setSelectedExampleId(example.id)
    setFieldError(null)
  }

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

    if (hasUnsavedResult) {
      modal.confirm({
        title: 'Есть несохранённые изменения',
        content: 'Разбор ещё не подтверждён. Если выбрать другой пример, результат и правки будут потеряны.',
        okText: 'Продолжить',
        cancelText: 'Отмена',
        okButtonProps: { danger: true },
        onOk: () => applyExample(example),
      })
      return
    }

    applyExample(example)
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
    setSaveError(null)
    setSaveRecoveryAvailable(false)
    setSaving(false)
    setSaved(false)
    setAnalyzedText(null)
    setCreatedAt(null)
    setRequest({ status: 'loading', result: null, error: null, errorCode: null })
    recordIdRef.current = null
    allowNavigationRef.current = false

    try {
      const result = await analyzeRequest(trimmedText, controller.signal)

      if (generation !== generationRef.current) {
        return
      }

      setAnalyzedText(trimmedText)
      setCreatedAt(new Date().toISOString())
      setAnalysisVersion((value) => value + 1)
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

  function handleAnalyzeClick() {
    if (saving) {
      return
    }

    if (hasUnsavedResult) {
      modal.confirm({
        title: 'Есть несохранённые изменения',
        content: 'Разбор ещё не подтверждён. Если запустить новый, результат и правки будут потеряны.',
        okText: 'Разобрать заново',
        cancelText: 'Отмена',
        okButtonProps: { danger: true },
        onOk: () => {
          void handleAnalyze()
        },
      })
      return
    }

    void handleAnalyze()
  }

  function handleCancel() {
    resetResult()
    message.info('Запрос отменён')
  }

  function scrollToResult() {
    const section = resultSectionRef.current

    if (!section) {
      return
    }

    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
    resultHeadingRef.current?.focus({ preventScroll: true })
  }

  async function handleConfirm(analysis: Analysis) {
    if (!request.result || !analyzedText || isStale || saving) {
      return
    }

    const recordId = recordIdRef.current ?? crypto.randomUUID()
    recordIdRef.current = recordId
    const confirmedAt = new Date().toISOString()

    const record: SavedAnalysis = {
      id: recordId,
      mode: request.result.mode,
      provider: request.result.provider,
      model: request.result.model,
      sourceText: analyzedText,
      createdAt: createdAt ?? confirmedAt,
      confirmedAt,
      modelAnalysis: request.result.analysis,
      analysis,
    }

    setSaving(true)
    setSaveError(null)
    setSaveRecoveryAvailable(false)

    try {
      const savedRecord = await saveAnalysis(record)
      allowNavigationRef.current = true
      setSaved(true)
      message.success('Разбор сохранён')
      navigate(`/history/${savedRecord.id}`)
    } catch (error) {
      setSaveError(getSaveErrorMessage(error))
      setSaveRecoveryAvailable(error instanceof StorageCorruptError)
    } finally {
      setSaving(false)
    }
  }

  function handleResetStorage() {
    modal.confirm({
      title: 'Сбросить историю?',
      content:
        'История повреждена. Все сохранённые разборы будут удалены. После сброса повторите сохранение текущего результата.',
      okText: 'Сбросить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await resetStorage()
          setSaveError(null)
          setSaveRecoveryAvailable(false)
          message.success('История сброшена. Повторите сохранение.')
        } catch (error) {
          setSaveError(getSaveErrorMessage(error))
        }
      },
    })
  }

  const announcement = saving
    ? 'Сохраняем разбор.'
    : request.status === 'loading'
      ? 'Идёт разбор обращения.'
      : request.status === 'success'
        ? 'Разбор готов. Проверьте поля и черновик ответа.'
        : request.status === 'error'
          ? 'Не удалось выполнить разбор. Прочитайте сообщение об ошибке.'
          : ''

  return (
    <div className={`page page--workspace${resultInView ? ' page--result-visible' : ''}`}>
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
                autoSize={{ minRows: 8, maxRows: 18 }}
                maxLength={maxLength}
                showCount
                disabled={request.status === 'loading' || saving}
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
                disabled={request.status === 'loading' || saving}
                classNames={{ popup: { root: 'app-select-sheet' } }}
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
                <Button type="primary" size="large" onClick={handleAnalyzeClick} disabled={!canAnalyze}>
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

        <section className="surface surface--result" aria-labelledby="result-heading" ref={resultSectionRef}>
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
                <AnalysisEditor
                  key={analysisVersion}
                  result={request.result}
                  isStale={isStale}
                  saving={saving}
                  saveError={saveError}
                  saveRecovery={
                    saveRecoveryAvailable
                      ? {
                          label: 'Сбросить историю',
                          onReset: handleResetStorage,
                        }
                      : null
                  }
                  onConfirm={handleConfirm}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>

      {request.status === 'success' && !resultInView ? (
        <Button className="to-result-button" type="primary" onClick={scrollToResult}>
          К результату
        </Button>
      ) : null}

      <Modal
        open={blocker.state === 'blocked'}
        title="Есть несохранённые изменения"
        okText="Уйти"
        cancelText="Остаться"
        okButtonProps={{ danger: true }}
        closable={false}
        maskClosable={false}
        onOk={() => {
          if (blocker.state === 'blocked') {
            blocker.proceed()
          }
        }}
        onCancel={() => {
          if (blocker.state === 'blocked') {
            blocker.reset()
          }
        }}
      >
        Разбор ещё не подтверждён. Если уйти со страницы, результат и правки будут потеряны.
      </Modal>
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

function getSaveErrorMessage(error: unknown): string {
  if (
    error instanceof StorageLimitError ||
    error instanceof StorageCorruptError ||
    error instanceof StorageUnavailableError
  ) {
    return error.message
  }

  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'В браузере закончилось место для истории. Удалите старые записи и попробуйте снова.'
  }

  return 'Не удалось сохранить разбор. Попробуйте ещё раз.'
}
