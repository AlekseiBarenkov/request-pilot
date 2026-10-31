import type { Evidence } from '../../shared/schemas/analysis'

export function EvidenceNote({ evidence, emptyText }: { evidence: Evidence | null; emptyText?: string }) {
  if (evidence === null) {
    return emptyText ? <p className="evidence evidence--muted">{emptyText}</p> : null
  }

  return (
    <div className={`evidence ${evidence.verified ? 'evidence--verified' : 'evidence--unverified'}`}>
      <span className="evidence__status">
        {evidence.verified ? 'Подтверждено' : 'Фрагмент не найден - проверьте значение'}
      </span>
      <blockquote className="evidence__quote">{evidence.snippet}</blockquote>
    </div>
  )
}
