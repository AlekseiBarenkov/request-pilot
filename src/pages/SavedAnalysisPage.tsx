import { App as AntApp, Button, Result, Skeleton } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CATEGORY, REQUEST_TYPE } from '../../shared/constants'
import { ErrorNotice } from '../components/ErrorNotice'
import { ModeBadge } from '../components/ModeBadge'
import { useSavedAnalysis } from '../data/hooks/useSavedAnalysis'
import { AnalysisPreview } from '../features/processing/AnalysisPreview'
import { createExportEnvelope } from '../features/saved/exportRecord'
import { copyToClipboard } from '../lib/clipboard'
import { formatDateTime } from '../lib/dates'
import { downloadJson } from '../lib/download'

export function SavedAnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const { status, record, error } = useSavedAnalysis(id)
  const { message } = AntApp.useApp()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    if (status === 'ready') {
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [status])

  async function handleCopy() {
    if (!record) {
      return
    }

    setCopying(true)

    try {
      await copyToClipboard(record.analysis.draftReply)
      message.success('Ответ скопирован')
    } catch {
      message.error('Не удалось скопировать ответ. Выделите текст и скопируйте вручную.')
    } finally {
      setCopying(false)
    }
  }

  function handleExport() {
    if (!record) {
      return
    }

    try {
      downloadJson(`request-pilot-${record.id}.json`, createExportEnvelope(record))
      message.success('Экспорт готов')
    } catch {
      message.error('Не удалось скачать файл.')
    }
  }

  if (status === 'loading') {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="page">
        <Result
          status="404"
          title="Разбор не найден"
          subTitle="Возможно, запись удалена или открыта в другом браузере."
          extra={
            <Link to="/history">
              <Button type="primary">К истории</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (status === 'error' || record === null) {
    return (
      <div className="page">
        <ErrorNotice title="Не удалось открыть разбор" message={error ?? 'Попробуйте вернуться к истории.'} />
        <p className="back-link-wrap">
          <Link className="back-link" to="/history">
            К истории
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="page page--workspace page--saved">
      <div className="page-heading">
        <Link className="back-link" to="/history">
          К истории
        </Link>
        <h1 tabIndex={-1} ref={headingRef}>
          Разбор от {formatDateTime(record.confirmedAt)}
        </h1>
        <div className="meta-row">
          <ModeBadge provider={record.provider} />
          <span className="meta-tag">
            {record.analysis.category.value === null ? 'Без категории' : CATEGORY[record.analysis.category.value]}
          </span>
          <span className="meta-tag">{REQUEST_TYPE[record.analysis.requestType]}</span>
        </div>
        <div className="saved-actions">
          <Button onClick={() => void handleCopy()} loading={copying}>
            Скопировать ответ
          </Button>
          <Button onClick={handleExport}>Экспорт JSON</Button>
        </div>
      </div>

      <div className="process-grid">
        <section className="surface surface--source" aria-labelledby="saved-source-heading">
          <div className="surface__header">
            <h2 className="surface__title" id="saved-source-heading">
              Исходное обращение
            </h2>
          </div>
          <div className="surface__body">
            <p className="source-text">{record.sourceText}</p>
          </div>
        </section>

        <section className="surface surface--result" aria-labelledby="saved-result-heading">
          <div className="surface__header">
            <h2 className="surface__title" id="saved-result-heading">
              Подтверждённые поля
            </h2>
          </div>
          <div className="surface__body">
            <AnalysisPreview
              result={{
                mode: record.mode,
                provider: record.provider,
                model: record.model,
                analysis: record.analysis,
              }}
              modelAnalysis={record.modelAnalysis}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
