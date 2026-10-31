import { Alert, App as AntApp, Button, Skeleton } from 'antd'
import { Link } from 'react-router-dom'

import { CATEGORY, HISTORY_LIMIT, REQUEST_TYPE } from '../../shared/constants'
import { EmptyState } from '../components/EmptyState'
import { ErrorNotice } from '../components/ErrorNotice'
import { ModeBadge } from '../components/ModeBadge'
import { useHistory } from '../data/hooks/useHistory'
import { resetStorage } from '../data/storage/analysesRepo'
import { formatDateTime } from '../lib/dates'

export function HistoryPage() {
  const { status, analyses, error, reload } = useHistory()
  const { modal, message } = AntApp.useApp()

  function handleReset() {
    modal.confirm({
      title: 'Сбросить историю?',
      content: 'Все сохранённые разборы будут удалены без возможности восстановления.',
      okText: 'Сбросить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await resetStorage()
          message.success('История сброшена')
          reload()
        } catch (reason) {
          message.error(reason instanceof Error ? reason.message : 'Не удалось сбросить историю.')
        }
      },
    })
  }

  return (
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h1>История разборов</h1>
          <p>Сохранённые результаты хранятся только в этом браузере.</p>
        </div>
        {status === 'ready' ? (
          <span className="counter">
            {analyses.length} из {HISTORY_LIMIT}
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <section className="surface">
          <div className="surface__body">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        </section>
      ) : null}

      {status === 'corrupt' ? (
        <Alert
          type="warning"
          showIcon
          message="История повреждена"
          description={error ?? 'Данные истории не удалось прочитать. Сбросьте историю, чтобы продолжить.'}
          action={
            <Button danger onClick={handleReset}>
              Сбросить историю
            </Button>
          }
        />
      ) : null}

      {status === 'unavailable' ? (
        <Alert
          type="info"
          showIcon
          message="История недоступна"
          description="Браузер не разрешает доступ к локальному хранилищу. Разбор можно выполнить, но сохранить результат и открыть историю не получится."
        />
      ) : null}

      {status === 'error' ? (
        <ErrorNotice title="Не удалось загрузить историю" message={error ?? 'Попробуйте ещё раз.'} onRetry={reload} />
      ) : null}

      {status === 'ready' ? (
        <>
          {analyses.length >= HISTORY_LIMIT ? (
            <Alert
              type="warning"
              showIcon
              message="Достигнут лимит истории"
              description="Лимит истории - 100 записей. Удалите старые, чтобы сохранить новый разбор."
            />
          ) : null}

          {analyses.length === 0 ? (
            <EmptyState
              title="Пока нет подтверждённых разборов"
              description="Разберите обращение клиента и подтвердите результат, чтобы он появился в истории."
              action={
                <Link to="/">
                  <Button type="primary">Перейти к обработке</Button>
                </Link>
              }
            />
          ) : (
            <div className="history-list">
              {analyses.map((analysis) => (
                <Link className="history-card" key={analysis.id} to={`/history/${analysis.id}`}>
                  <div className="history-card__top">
                    <span className="history-card__date">{formatDateTime(analysis.confirmedAt)}</span>
                    <ModeBadge provider={analysis.provider} />
                  </div>
                  <h2 className="history-card__name">{analysis.analysis.customer.name.value ?? 'Клиент не указан'}</h2>
                  <p className="history-card__summary">{analysis.analysis.summary}</p>
                  <div className="history-card__meta">
                    <span>
                      {analysis.analysis.category.value === null
                        ? 'Без категории'
                        : CATEGORY[analysis.analysis.category.value]}
                    </span>
                    <span>{REQUEST_TYPE[analysis.analysis.requestType]}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
