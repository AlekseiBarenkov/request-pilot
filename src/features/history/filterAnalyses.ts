import type { CategoryId } from '../../../shared/constants'
import { normalizeForMatch } from '../../../shared/normalize'
import type { SavedAnalysis } from '../../../shared/schemas/saved'

export type CategoryFilter = 'all' | 'none' | CategoryId

export function filterAnalyses(
  analyses: readonly SavedAnalysis[],
  query: string,
  category: CategoryFilter,
): SavedAnalysis[] {
  return analyses.filter((record) => matchesCategory(record, category) && matchesQuery(record, query))
}

function matchesCategory(record: SavedAnalysis, category: CategoryFilter): boolean {
  if (category === 'all') {
    return true
  }

  if (category === 'none') {
    return record.analysis.category.value === null
  }

  return record.analysis.category.value === category
}

function matchesQuery(record: SavedAnalysis, query: string): boolean {
  const normalizedQuery = normalizeForMatch(query)

  if (normalizedQuery.length === 0) {
    return true
  }

  const searchable = [
    record.analysis.customer.name.value,
    record.analysis.customer.phone.value,
    record.analysis.summary,
    record.sourceText,
    record.analysis.draftReply,
  ]

  if (searchable.some((value) => value !== null && includesAtWordStart(value, normalizedQuery))) {
    return true
  }

  const digits = query.replace(/\D/g, '')

  if (digits.length === 0) {
    return false
  }

  const phone = record.analysis.customer.phone.value ?? ''
  return phone.replace(/\D/g, '').includes(digits)
}

function includesAtWordStart(value: string, normalizedQuery: string): boolean {
  const normalizedValue = normalizeForMatch(value)
  let index = normalizedValue.indexOf(normalizedQuery)

  while (index !== -1) {
    const previous = index > 0 ? normalizedValue.charAt(index - 1) : ''

    if (previous === '' || !/[a-zа-я0-9]/.test(previous)) {
      return true
    }

    index = normalizedValue.indexOf(normalizedQuery, index + 1)
  }

  return false
}
