import type { ReactNode } from 'react'

import { CATEGORY, REQUEST_TYPE, URGENCY } from '../../../shared/constants'
import type { Urgency } from '../../../shared/constants'
import type { Analysis, Evidence } from '../../../shared/schemas/analysis'
import type { AnalyzeResponse } from '../../../shared/schemas/api'
import { ChangedBadge } from '../../components/ChangedBadge'
import { EvidenceNote } from '../../components/EvidenceNote'
import { ModeBadge } from '../../components/ModeBadge'
import { ResultModeNotice } from '../../components/ResultModeNotice'

export type AnalysisPreviewProps = {
  result: AnalyzeResponse
  modelAnalysis?: Analysis
}

export function AnalysisPreview({ result, modelAnalysis }: AnalysisPreviewProps) {
  const { analysis } = result

  const summaryChanged = modelAnalysis ? analysis.summary !== modelAnalysis.summary : false
  const categoryChanged = modelAnalysis ? analysis.category.value !== modelAnalysis.category.value : false
  const requestTypeChanged = modelAnalysis ? analysis.requestType !== modelAnalysis.requestType : false
  const nameChanged = modelAnalysis ? analysis.customer.name.value !== modelAnalysis.customer.name.value : false
  const phoneChanged = modelAnalysis ? analysis.customer.phone.value !== modelAnalysis.customer.phone.value : false
  const addressChanged = modelAnalysis
    ? analysis.customer.address.value !== modelAnalysis.customer.address.value
    : false
  const problemChanged = modelAnalysis ? analysis.problem !== modelAnalysis.problem : false
  const urgencyChanged = modelAnalysis ? analysis.urgency.value !== modelAnalysis.urgency.value : false
  const missingChanged = modelAnalysis ? !sameStringList(analysis.missing, modelAnalysis.missing) : false
  const questionsChanged = modelAnalysis ? !sameStringList(analysis.questions, modelAnalysis.questions) : false
  const draftChanged = modelAnalysis ? analysis.draftReply !== modelAnalysis.draftReply : false

  const categoryEvidence = categoryChanged ? null : analysis.category.evidence
  const nameEvidence = nameChanged ? null : analysis.customer.name.evidence
  const phoneEvidence = phoneChanged ? null : analysis.customer.phone.evidence
  const addressEvidence = addressChanged ? null : analysis.customer.address.evidence
  const urgencyEvidence = urgencyChanged ? null : analysis.urgency.evidence

  return (
    <div className="analysis">
      <ResultModeNotice mode={result.mode} provider={result.provider} />

      <div className="analysis__meta">
        <ModeBadge provider={result.provider} />
      </div>

      <dl className="field-list">
        <div className="field">
          <FieldTerm changed={summaryChanged}>Краткое содержание</FieldTerm>
          <dd>{analysis.summary}</dd>
        </div>

        <div className="field">
          <FieldTerm changed={categoryChanged} manual>
            Категория техники
          </FieldTerm>
          <dd>
            <p>{analysis.category.value === null ? 'Не определена' : CATEGORY[analysis.category.value]}</p>
            <EvidenceNote evidence={categoryEvidence} />
          </dd>
        </div>

        <div className="field">
          <FieldTerm changed={requestTypeChanged}>Тип обращения</FieldTerm>
          <dd>{REQUEST_TYPE[analysis.requestType]}</dd>
        </div>

        <div className="field">
          <FieldTerm changed={nameChanged} manual>
            Имя клиента
          </FieldTerm>
          <dd>
            <p>{analysis.customer.name.value ?? 'Не указано'}</p>
            <EvidenceNote evidence={nameEvidence} />
          </dd>
        </div>

        <div className="field">
          <FieldTerm changed={phoneChanged} manual>
            Телефон
          </FieldTerm>
          <dd>
            <p>{analysis.customer.phone.value ?? 'Не указано'}</p>
            <EvidenceNote evidence={phoneEvidence} />
          </dd>
        </div>

        <div className="field">
          <FieldTerm changed={addressChanged} manual>
            Адрес
          </FieldTerm>
          <dd>
            <p>{analysis.customer.address.value ?? 'Не указано'}</p>
            <EvidenceNote evidence={addressEvidence} />
          </dd>
        </div>

        <div className="field">
          <FieldTerm changed={problemChanged}>Описание неисправности</FieldTerm>
          <dd>{analysis.problem ?? 'Не указано'}</dd>
        </div>

        <div className="field">
          <FieldTerm changed={urgencyChanged} manual>
            Срочность
          </FieldTerm>
          <dd>
            <p>{URGENCY[analysis.urgency.value]}</p>
            <UrgencyEvidence value={analysis.urgency.value} evidence={urgencyEvidence} />
          </dd>
        </div>

        <div className="field">
          <FieldTerm changed={missingChanged}>Недостающие сведения</FieldTerm>
          <dd>
            <ListValue items={analysis.missing} emptyText="Недостающих сведений нет." />
          </dd>
        </div>

        <div className="field">
          <FieldTerm changed={questionsChanged}>Уточняющие вопросы</FieldTerm>
          <dd>
            <ListValue items={analysis.questions} emptyText="Уточняющих вопросов нет." />
          </dd>
        </div>

        <div className="field field--wide">
          <FieldTerm changed={draftChanged}>Черновик ответа</FieldTerm>
          <dd>
            <p className="draft-text">{analysis.draftReply}</p>
          </dd>
        </div>
      </dl>
    </div>
  )
}

function FieldTerm({ children, changed, manual = false }: { children: ReactNode; changed: boolean; manual?: boolean }) {
  return (
    <dt>
      <span>{children}</span>
      {changed ? <ChangedBadge label={manual ? 'Изменено вручную' : 'Изменено'} /> : null}
    </dt>
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

function ListValue({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="muted-text">{emptyText}</p>
  }

  return (
    <ul className="plain-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function sameStringList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}
