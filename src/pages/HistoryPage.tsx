import { Alert, App as AntApp, Button, Input, Select, Skeleton } from 'antd'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CATEGORY, CATEGORY_IDS, HISTORY_LIMIT, REQUEST_TYPE } from '../../shared/constants'
import type { SavedAnalysis } from '../../shared/schemas/saved'
import { EmptyState } from '../components/EmptyState'
import { ErrorNotice } from '../components/ErrorNotice'
import { ModeBadge } from '../components/ModeBadge'
import { useConfig } from '../data/hooks/useConfig'
import { useDebouncedValue } from '../data/hooks/useDebouncedValue'
import { useHistory } from '../data/hooks/useHistory'
import { clearAnalyses, removeAnalysis, resetStorage } from '../data/storage/analysesRepo'
import { filterAnalyses } from '../features/history/filterAnalyses'
import type { CategoryFilter } from '../features/history/filterAnalyses'
import { seedDemoHistory, DEMO_SEED_IDS } from '../features/history/seedDemo'
import { formatDateTime } from '../lib/dates'

const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'Все категории' },
  ...CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORY[id] })),
  { value: 'none', label: 'Без категории' },
]

export function HistoryPage() {
  const { status, analyses, error, reload } = useHistory()
  const { config } = useConfig()
  const { modal, message } = AntApp.useApp()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query)
  const filtered = useMemo(
    () => filterAnalyses(analyses, debouncedQuery, category),
    [analyses, debouncedQuery, category],
  )
  const hasFilters = query.trim().length > 0 || category !== 'all'
  const canSeed =
    import.meta.env.DEV &&
    config?.mode === 'demo' &&
    DEMO_SEED_IDS.some((seedId) => !analyses.some((record) => record.id === seedId))

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

  function handleClear() {
    modal.confirm({
      title: 'Очистить историю?',
      content: `Будут удалены все сохранённые разборы: ${analyses.length}. Это действие нельзя отменить.`,
      okText: 'Очистить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        setClearing(true)

        try {
          await clearAnalyses()
          message.success('История очищена')
          reload()
        } catch (reason) {
          message.error(reason instanceof Error ? reason.message : 'Не удалось очистить историю.')
        } finally {
          setClearing(false)
        }
      },
    })
  }

  function handleDelete(record: SavedAnalysis) {
    modal.confirm({
      title: 'Удалить разбор?',
      content: `Разбор от ${formatDateTime(record.confirmedAt)} будет удалён.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingId(record.id)

        try {
          await removeAnalysis(record.id)
          message.success('Разбор удалён')
          reload()
        } catch (reason) {
          message.error(reason instanceof Error ? reason.message : 'Не удалось удалить разбор.')
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  async function handleSeed() {
    setSeeding(true)

    try {
      const result = await seedDemoHistory()
      message.success(
        result.added > 0 ? `Добавлено тестовых разборов: ${result.added}` : 'Тестовые данные уже добавлены',
      )
      reload()
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : 'Не удалось подготовить тестовые данные.')
    } finally {
      setSeeding(false)
    }
  }

  function resetFilters() {
    setQuery('')
    setCategory('all')
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

          {analyses.length > 0 ? (
            <div className="history-toolbar">
              <div className="form-field">
                <label className="form-label" htmlFor="history-search">
                  Поиск
                </label>
                <Input
                  id="history-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  allowClear
                  placeholder="Имя, телефон, текст обращения"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="history-category">
                  Категория
                </label>
                <Select<CategoryFilter>
                  id="history-category"
                  value={category}
                  onChange={(value) => setCategory(value)}
                  options={categoryOptions}
                />
              </div>

              <div className="history-toolbar__actions">
                <span className="muted-text">Найдено: {filtered.length}</span>
                {canSeed ? (
                  <Button type="text" onClick={handleSeed} loading={seeding}>
                    Добавить демо-данные
                  </Button>
                ) : null}
                <Button danger onClick={handleClear} loading={clearing}>
                  Очистить историю
                </Button>
              </div>
            </div>
          ) : null}

          {analyses.length === 0 ? (
            <EmptyState
              title="Пока нет подтверждённых разборов"
              description="Разберите обращение клиента и подтвердите результат, чтобы он появился в истории."
              action={
                <div className="empty-state__actions">
                  <Link to="/">
                    <Button type="primary">Перейти к обработке</Button>
                  </Link>
                  {canSeed ? (
                    <Button onClick={handleSeed} loading={seeding}>
                      Заполнить демо-данными
                    </Button>
                  ) : null}
                </div>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Ничего не найдено"
              description="В истории нет записей, подходящих под запрос и выбранную категорию."
              action={
                hasFilters ? (
                  <Button onClick={resetFilters}>Сбросить поиск и фильтр</Button>
                ) : (
                  <Button onClick={handleClear} loading={clearing}>
                    Очистить историю
                  </Button>
                )
              }
            />
          ) : (
            <div className="history-list">
              {filtered.map((record) => (
                <article className="history-card" key={record.id}>
                  <Link className="history-card__body" to={`/history/${record.id}`}>
                    <div className="history-card__top">
                      <span className="history-card__date">{formatDateTime(record.confirmedAt)}</span>
                      <ModeBadge provider={record.provider} />
                    </div>
                    <h2 className="history-card__name">{record.analysis.customer.name.value ?? 'Клиент не указан'}</h2>
                    <p className="history-card__summary">{record.analysis.summary}</p>
                    <div className="history-card__meta">
                      <span>
                        {record.analysis.category.value === null
                          ? 'Без категории'
                          : CATEGORY[record.analysis.category.value]}
                      </span>
                      <span>{REQUEST_TYPE[record.analysis.requestType]}</span>
                    </div>
                  </Link>
                  <div className="history-card__actions">
                    <Button
                      type="text"
                      danger
                      size="small"
                      loading={deletingId === record.id}
                      onClick={() => handleDelete(record)}
                    >
                      Удалить
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
