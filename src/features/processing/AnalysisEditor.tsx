import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Select } from 'antd'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import {
  CATEGORY,
  CATEGORY_IDS,
  MAX_LIST_ITEMS,
  REQUEST_TYPE,
  REQUEST_TYPE_IDS,
  URGENCY,
  URGENCY_IDS,
} from '../../../shared/constants'
import type { CategoryId, RequestType, Urgency } from '../../../shared/constants'
import type { Evidence } from '../../../shared/schemas/analysis'
import type { Analysis } from '../../../shared/schemas/analysis'
import type { AnalyzeResponse } from '../../../shared/schemas/api'
import { ChangedBadge } from '../../components/ChangedBadge'
import { ErrorNotice } from '../../components/ErrorNotice'
import { EvidenceNote } from '../../components/EvidenceNote'
import { ModeBadge } from '../../components/ModeBadge'
import { ResultModeNotice } from '../../components/ResultModeNotice'
import {
  analysisFormSchema,
  buildAnalysis,
  cleanOptionalText,
  sameList,
  sameOptionalText,
  toFormValues,
} from './analysisForm'
import type { AnalysisFormValues } from './analysisForm'

const CATEGORY_NONE = 'none'

const categoryOptions = [
  { value: CATEGORY_NONE, label: 'Не определена' },
  ...CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORY[id] })),
]

const requestTypeOptions = REQUEST_TYPE_IDS.map((id) => ({ value: id, label: REQUEST_TYPE[id] }))
const urgencyOptions = URGENCY_IDS.map((id) => ({ value: id, label: URGENCY[id] }))

function toCategoryId(value: string): CategoryId | null {
  return CATEGORY_IDS.find((id) => id === value) ?? null
}

export type AnalysisEditorProps = {
  result: AnalyzeResponse
  isStale: boolean
  saving: boolean
  saveError: string | null
  onConfirm: (analysis: Analysis) => void
}

export function AnalysisEditor({ result, isStale, saving, saveError, onConfirm }: AnalysisEditorProps) {
  const model = result.analysis
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: toFormValues(model),
    mode: 'onTouched',
  })
  const { control, handleSubmit, watch } = form
  const values = watch()

  const missing = useFieldArray({ control, name: 'missing' })
  const questions = useFieldArray({ control, name: 'questions' })

  const summaryChanged = values.summary.trim() !== model.summary
  const categoryChanged = values.category !== model.category.value
  const requestTypeChanged = values.requestType !== model.requestType
  const nameChanged = !sameOptionalText(values.customerName, model.customer.name.value)
  const phoneChanged = !sameOptionalText(values.phone, model.customer.phone.value)
  const addressChanged = !sameOptionalText(values.address, model.customer.address.value)
  const problemChanged = cleanOptionalText(values.problem) !== model.problem
  const urgencyChanged = values.urgency !== model.urgency.value
  const missingChanged = !sameList(values.missing, model.missing)
  const questionsChanged = !sameList(values.questions, model.questions)
  const draftChanged = values.draftReply.trim() !== model.draftReply

  const categoryEvidence = categoryChanged ? null : model.category.evidence
  const nameEvidence = nameChanged ? null : model.customer.name.evidence
  const phoneEvidence = phoneChanged ? null : model.customer.phone.evidence
  const addressEvidence = addressChanged ? null : model.customer.address.evidence
  const urgencyEvidence = urgencyChanged ? null : model.urgency.evidence

  const canSave = !isStale && !saving && values.summary.trim().length > 0 && values.draftReply.trim().length > 0

  const submit = handleSubmit((formValues) => {
    if (isStale || saving) {
      return
    }

    setSubmitError(null)

    try {
      onConfirm(buildAnalysis(formValues, model))
    } catch {
      setSubmitError('Не удалось подготовить результат к сохранению. Проверьте поля.')
    }
  })

  return (
    <div className="analysis">
      <ResultModeNotice mode={result.mode} provider={result.provider} />
      <div className="analysis__meta">
        <ModeBadge provider={result.provider} />
      </div>

      <form className="analysis-form" noValidate onSubmit={submit}>
        <fieldset className="analysis-fields" disabled={saving}>
          <div className="form-field">
            <FieldLabel htmlFor="analysis-summary" changed={summaryChanged}>
              Краткое содержание
            </FieldLabel>
            <Controller
              control={control}
              name="summary"
              render={({ field, fieldState }) => (
                <>
                  <Input.TextArea
                    id="analysis-summary"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    maxLength={600}
                    status={fieldState.error ? 'error' : undefined}
                    aria-invalid={fieldState.error !== undefined}
                    aria-describedby={fieldState.error ? 'analysis-summary-error' : undefined}
                  />
                  <FieldError id="analysis-summary-error" message={fieldState.error?.message} />
                </>
              )}
            />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-category" changed={categoryChanged} badgeLabel="Изменено вручную">
              Категория техники
            </FieldLabel>
            <Controller
              control={control}
              name="category"
              render={({ field, fieldState }) => (
                <Select<string>
                  id="analysis-category"
                  value={field.value ?? CATEGORY_NONE}
                  onChange={(value) => field.onChange(toCategoryId(value))}
                  onBlur={field.onBlur}
                  options={categoryOptions}
                  status={fieldState.error ? 'error' : undefined}
                  aria-invalid={fieldState.error !== undefined}
                />
              )}
            />
            <EvidenceNote evidence={categoryEvidence} />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-request-type" changed={requestTypeChanged}>
              Тип обращения
            </FieldLabel>
            <Controller
              control={control}
              name="requestType"
              render={({ field, fieldState }) => (
                <Select<RequestType>
                  id="analysis-request-type"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  options={requestTypeOptions}
                  status={fieldState.error ? 'error' : undefined}
                  aria-invalid={fieldState.error !== undefined}
                />
              )}
            />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-name" changed={nameChanged} badgeLabel="Изменено вручную">
              Имя клиента
            </FieldLabel>
            <Controller
              control={control}
              name="customerName"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="analysis-name"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    placeholder="Не указано"
                    maxLength={120}
                    status={fieldState.error ? 'error' : undefined}
                    aria-invalid={fieldState.error !== undefined}
                    aria-describedby={fieldState.error ? 'analysis-name-error' : undefined}
                  />
                  <FieldError id="analysis-name-error" message={fieldState.error?.message} />
                </>
              )}
            />
            <EvidenceNote evidence={nameEvidence} />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-phone" changed={phoneChanged} badgeLabel="Изменено вручную">
              Телефон
            </FieldLabel>
            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="analysis-phone"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    placeholder="Не указано"
                    maxLength={60}
                    status={fieldState.error ? 'error' : undefined}
                    aria-invalid={fieldState.error !== undefined}
                    aria-describedby={fieldState.error ? 'analysis-phone-error' : undefined}
                  />
                  <FieldError id="analysis-phone-error" message={fieldState.error?.message} />
                </>
              )}
            />
            <EvidenceNote evidence={phoneEvidence} />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-address" changed={addressChanged} badgeLabel="Изменено вручную">
              Адрес
            </FieldLabel>
            <Controller
              control={control}
              name="address"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="analysis-address"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    placeholder="Не указано"
                    maxLength={300}
                    status={fieldState.error ? 'error' : undefined}
                    aria-invalid={fieldState.error !== undefined}
                    aria-describedby={fieldState.error ? 'analysis-address-error' : undefined}
                  />
                  <FieldError id="analysis-address-error" message={fieldState.error?.message} />
                </>
              )}
            />
            <EvidenceNote evidence={addressEvidence} />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-problem" changed={problemChanged}>
              Описание неисправности
            </FieldLabel>
            <Controller
              control={control}
              name="problem"
              render={({ field, fieldState }) => (
                <>
                  <Input.TextArea
                    id="analysis-problem"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    maxLength={1000}
                    status={fieldState.error ? 'error' : undefined}
                    aria-invalid={fieldState.error !== undefined}
                    aria-describedby={fieldState.error ? 'analysis-problem-error' : undefined}
                  />
                  <FieldError id="analysis-problem-error" message={fieldState.error?.message} />
                </>
              )}
            />
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-urgency" changed={urgencyChanged} badgeLabel="Изменено вручную">
              Срочность
            </FieldLabel>
            <Controller
              control={control}
              name="urgency"
              render={({ field, fieldState }) => (
                <Select<Urgency>
                  id="analysis-urgency"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  options={urgencyOptions}
                  status={fieldState.error ? 'error' : undefined}
                  aria-invalid={fieldState.error !== undefined}
                />
              )}
            />
            <UrgencyEvidence value={values.urgency} evidence={urgencyEvidence} />
          </div>

          <div className="form-field">
            <FieldLabel labelId="analysis-missing-label" changed={missingChanged}>
              Недостающие сведения
            </FieldLabel>
            <div className="list-editor" role="group" aria-labelledby="analysis-missing-label">
              {missing.fields.length === 0 ? <p className="muted-text">Недостающих сведений нет.</p> : null}
              {missing.fields.map((item, index) => (
                <div className="list-editor__row" key={item.id}>
                  <Controller
                    control={control}
                    name={`missing.${index}.value`}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        aria-label={`Недостающее сведение ${index + 1}`}
                        maxLength={300}
                      />
                    )}
                  />
                  <Button
                    type="text"
                    danger
                    onClick={() => missing.remove(index)}
                    aria-label={`Удалить пункт ${index + 1}`}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
              <p className="form-hint">До {MAX_LIST_ITEMS} пунктов. Пустые пункты не сохраняются.</p>
              <Button
                type="dashed"
                onClick={() => missing.append({ value: '' })}
                disabled={missing.fields.length >= MAX_LIST_ITEMS}
              >
                Добавить пункт
              </Button>
            </div>
          </div>

          <div className="form-field">
            <FieldLabel labelId="analysis-questions-label" changed={questionsChanged}>
              Уточняющие вопросы
            </FieldLabel>
            <div className="list-editor" role="group" aria-labelledby="analysis-questions-label">
              {questions.fields.length === 0 ? <p className="muted-text">Уточняющих вопросов нет.</p> : null}
              {questions.fields.map((item, index) => (
                <div className="list-editor__row" key={item.id}>
                  <Controller
                    control={control}
                    name={`questions.${index}.value`}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        aria-label={`Уточняющий вопрос ${index + 1}`}
                        maxLength={300}
                      />
                    )}
                  />
                  <Button
                    type="text"
                    danger
                    onClick={() => questions.remove(index)}
                    aria-label={`Удалить вопрос ${index + 1}`}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
              <p className="form-hint">До {MAX_LIST_ITEMS} пунктов. Пустые пункты не сохраняются.</p>
              <Button
                type="dashed"
                onClick={() => questions.append({ value: '' })}
                disabled={questions.fields.length >= MAX_LIST_ITEMS}
              >
                Добавить вопрос
              </Button>
            </div>
          </div>

          <div className="form-field">
            <FieldLabel htmlFor="analysis-draft" changed={draftChanged}>
              Черновик ответа
            </FieldLabel>
            <Controller
              control={control}
              name="draftReply"
              render={({ field, fieldState }) => (
                <>
                  <Input.TextArea
                    id="analysis-draft"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    autoSize={{ minRows: 4, maxRows: 10 }}
                    maxLength={3000}
                    status={fieldState.error ? 'error' : undefined}
                    aria-invalid={fieldState.error !== undefined}
                    aria-describedby={fieldState.error ? 'analysis-draft-error' : undefined}
                  />
                  <FieldError id="analysis-draft-error" message={fieldState.error?.message} />
                </>
              )}
            />
          </div>
        </fieldset>

        <div className="editor-actions">
          {saveError ? (
            <div className="editor-error">
              <ErrorNotice title="Не удалось сохранить разбор" message={saveError} />
              <Link className="back-link" to="/history">
                Открыть историю
              </Link>
            </div>
          ) : null}
          {submitError ? (
            <div className="editor-error">
              <ErrorNotice title="Не удалось подготовить сохранение" message={submitError} />
            </div>
          ) : null}
          <Button type="primary" size="large" htmlType="submit" block loading={saving} disabled={!canSave}>
            Подтвердить и сохранить
          </Button>
          <p className="form-hint">
            {isStale
              ? 'Текст обращения изменён. Разберите его заново, чтобы сохранить результат.'
              : canSave
                ? 'Сохранение подтверждает сотрудник. Запись останется в истории этого браузера.'
                : 'Заполните краткое содержание и черновик ответа, чтобы сохранить.'}
          </p>
          <p className="visually-hidden" role="status" aria-live="polite">
            {saving ? 'Сохраняем разбор.' : ''}
          </p>
        </div>
      </form>
    </div>
  )
}

function FieldLabel({
  htmlFor,
  labelId,
  changed,
  badgeLabel = 'Изменено',
  children,
}: {
  htmlFor?: string
  labelId?: string
  changed: boolean
  badgeLabel?: string
  children: ReactNode
}) {
  return (
    <div className="form-label-row">
      {htmlFor ? (
        <label className="form-label" htmlFor={htmlFor}>
          {children}
        </label>
      ) : (
        <span className="form-label" id={labelId}>
          {children}
        </span>
      )}
      {changed ? <ChangedBadge label={badgeLabel} /> : null}
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null
  }

  return (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  )
}

function UrgencyEvidence({ value, evidence }: { value: Urgency; evidence: Evidence | null }) {
  if (value === 'urgent') {
    if (evidence?.verified) {
      return <EvidenceNote evidence={evidence} />
    }

    return <p className="evidence evidence--warning">Срочность требует проверки: подтверждающий фрагмент не найден.</p>
  }

  if (value === 'normal') {
    if (evidence?.verified) {
      return <EvidenceNote evidence={evidence} />
    }

    return <p className="evidence evidence--muted">Явных признаков срочности нет.</p>
  }

  return <p className="evidence evidence--muted">Срочность не определена.</p>
}
