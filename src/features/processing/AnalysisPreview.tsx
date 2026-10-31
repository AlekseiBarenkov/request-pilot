import { CATEGORY, REQUEST_TYPE, URGENCY } from '../../../shared/constants'
import type { Urgency } from '../../../shared/constants'
import type { Evidence } from '../../../shared/schemas/analysis'
import type { AnalyzeResponse } from '../../../shared/schemas/api'
import { EvidenceNote } from '../../components/EvidenceNote'
import { ModeBadge } from '../../components/ModeBadge'
import { ResultModeNotice } from '../../components/ResultModeNotice'

export function AnalysisPreview({ result }: { result: AnalyzeResponse }) {
  const { analysis } = result

  return (
    <div className="analysis">
      <ResultModeNotice mode={result.mode} provider={result.provider} />

      <div className="analysis__meta">
        <ModeBadge provider={result.provider} />
      </div>

      <dl className="field-list">
        <div className="field">
          <dt>Краткое содержание</dt>
          <dd>{analysis.summary}</dd>
        </div>

        <div className="field">
          <dt>Категория техники</dt>
          <dd>
            <p>{analysis.category.value === null ? 'Не определена' : CATEGORY[analysis.category.value]}</p>
            <EvidenceNote evidence={analysis.category.evidence} />
          </dd>
        </div>

        <div className="field">
          <dt>Тип обращения</dt>
          <dd>{REQUEST_TYPE[analysis.requestType]}</dd>
        </div>

        <div className="field">
          <dt>Имя клиента</dt>
          <dd>
            <p>{analysis.customer.name.value ?? 'Не указано'}</p>
            <EvidenceNote evidence={analysis.customer.name.evidence} />
          </dd>
        </div>

        <div className="field">
          <dt>Телефон</dt>
          <dd>
            <p>{analysis.customer.phone.value ?? 'Не указано'}</p>
            <EvidenceNote evidence={analysis.customer.phone.evidence} />
          </dd>
        </div>

        <div className="field">
          <dt>Адрес</dt>
          <dd>
            <p>{analysis.customer.address.value ?? 'Не указано'}</p>
            <EvidenceNote evidence={analysis.customer.address.evidence} />
          </dd>
        </div>

        <div className="field">
          <dt>Описание неисправности</dt>
          <dd>{analysis.problem ?? 'Не указано'}</dd>
        </div>

        <div className="field">
          <dt>Срочность</dt>
          <dd>
            <p>{URGENCY[analysis.urgency.value]}</p>
            <UrgencyEvidence value={analysis.urgency.value} evidence={analysis.urgency.evidence} />
          </dd>
        </div>

        <div className="field">
          <dt>Недостающие сведения</dt>
          <dd>
            <ListValue items={analysis.missing} emptyText="Недостающих сведений нет." />
          </dd>
        </div>

        <div className="field">
          <dt>Уточняющие вопросы</dt>
          <dd>
            <ListValue items={analysis.questions} emptyText="Уточняющих вопросов нет." />
          </dd>
        </div>

        <div className="field field--wide">
          <dt>Черновик ответа</dt>
          <dd>
            <p className="draft-text">{analysis.draftReply}</p>
          </dd>
        </div>
      </dl>
    </div>
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
