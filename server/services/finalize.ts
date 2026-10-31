import { MAX_LIST_ITEMS } from '../../shared/constants'
import { normalizeForMatch } from '../../shared/normalize'
import { AnalysisSchema } from '../../shared/schemas/analysis'
import type { Analysis, Evidence, Field } from '../../shared/schemas/analysis'
import type { ModelAnalysis } from '../../shared/schemas/model'

export function finalizeAnalysis(model: ModelAnalysis, sourceText: string): Analysis {
  const normalizedSource = normalizeForMatch(sourceText)

  const analysis = {
    summary: model.summary.trim(),
    category: toField(model.category, model.categoryEvidence, normalizedSource),
    requestType: model.requestType,
    customer: {
      name: toField(cleanValue(model.customerName), model.customerNameEvidence, normalizedSource),
      phone: toField(cleanValue(model.phone), model.phoneEvidence, normalizedSource),
      address: toField(cleanValue(model.address), model.addressEvidence, normalizedSource),
    },
    problem: cleanValue(model.problem),
    urgency: {
      value: model.urgency,
      evidence: toEvidence(model.urgencyEvidence, normalizedSource),
    },
    missing: cleanList(model.missing),
    questions: cleanList(model.questions),
    draftReply: model.draftReply.trim(),
  }

  return AnalysisSchema.parse(analysis)
}

function cleanValue(value: string | null): string | null {
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanList(items: readonly string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const value = item.trim()

    if (value.length === 0) {
      continue
    }

    const key = normalizeForMatch(value)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(value)

    if (result.length === MAX_LIST_ITEMS) {
      break
    }
  }

  return result
}

function toEvidence(snippet: string | null, normalizedSource: string): Evidence | null {
  const value = cleanValue(snippet)

  if (value === null) {
    return null
  }

  return {
    snippet: value,
    verified: normalizedSource.includes(normalizeForMatch(value)),
  }
}

function toField<T>(value: T | null, snippet: string | null, normalizedSource: string): Field<T> {
  if (value === null) {
    return { value: null, evidence: null }
  }

  return { value, evidence: toEvidence(snippet, normalizedSource) }
}
