import { z } from 'zod'

import { MAX_LIST_ITEMS } from '../../../shared/constants'
import { normalizeForMatch } from '../../../shared/normalize'
import { AnalysisSchema } from '../../../shared/schemas/analysis'
import type { Analysis } from '../../../shared/schemas/analysis'
import { CategorySchema, RequestTypeSchema, UrgencySchema } from '../../../shared/schemas/common'

export const analysisFormSchema = z.object({
  summary: z.string().trim().min(1, 'Введите краткое содержание.').max(600, 'Краткое содержание длиннее 600 символов.'),
  category: CategorySchema.nullable(),
  requestType: RequestTypeSchema,
  customerName: z.string().trim().max(120, 'Имя длиннее 120 символов.'),
  phone: z.string().trim().max(60, 'Телефон длиннее 60 символов.'),
  address: z.string().trim().max(300, 'Адрес длиннее 300 символов.'),
  problem: z.string().trim().max(1000, 'Описание длиннее 1000 символов.'),
  urgency: UrgencySchema,
  missing: z
    .array(z.object({ value: z.string().trim().max(300, 'Пункт длиннее 300 символов.') }))
    .max(MAX_LIST_ITEMS, 'Не больше 10 пунктов.'),
  questions: z
    .array(z.object({ value: z.string().trim().max(300, 'Пункт длиннее 300 символов.') }))
    .max(MAX_LIST_ITEMS, 'Не больше 10 пунктов.'),
  draftReply: z.string().trim().min(1, 'Введите черновик ответа.').max(3000, 'Черновик длиннее 3000 символов.'),
})

export type AnalysisFormValues = z.infer<typeof analysisFormSchema>

export function toFormValues(model: Analysis): AnalysisFormValues {
  return {
    summary: model.summary,
    category: model.category.value,
    requestType: model.requestType,
    customerName: model.customer.name.value ?? '',
    phone: model.customer.phone.value ?? '',
    address: model.customer.address.value ?? '',
    problem: model.problem ?? '',
    urgency: model.urgency.value,
    missing: model.missing.map((value) => ({ value })),
    questions: model.questions.map((value) => ({ value })),
    draftReply: model.draftReply,
  }
}

export function cleanOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function cleanList(values: readonly { value: string }[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const item of values) {
    const value = item.value.trim()

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

export function sameOptionalText(value: string, modelValue: string | null): boolean {
  return cleanOptionalText(value) === modelValue
}

export function sameList(values: readonly { value: string }[], modelValues: readonly string[]): boolean {
  const current = cleanList(values)

  if (current.length !== modelValues.length) {
    return false
  }

  return current.every((value, index) => value === modelValues[index])
}

export function buildAnalysis(values: AnalysisFormValues, model: Analysis): Analysis {
  const category = values.category
  const name = cleanOptionalText(values.customerName)
  const phone = cleanOptionalText(values.phone)
  const address = cleanOptionalText(values.address)
  const urgency = values.urgency
  const result: Analysis = {
    summary: values.summary.trim(),
    category: {
      value: category,
      evidence: category === model.category.value ? model.category.evidence : null,
    },
    requestType: values.requestType,
    customer: {
      name: {
        value: name,
        evidence: name === model.customer.name.value ? model.customer.name.evidence : null,
      },
      phone: {
        value: phone,
        evidence: phone === model.customer.phone.value ? model.customer.phone.evidence : null,
      },
      address: {
        value: address,
        evidence: address === model.customer.address.value ? model.customer.address.evidence : null,
      },
    },
    problem: cleanOptionalText(values.problem),
    urgency: {
      value: urgency,
      evidence: urgency === model.urgency.value ? model.urgency.evidence : null,
    },
    missing: cleanList(values.missing),
    questions: cleanList(values.questions),
    draftReply: values.draftReply.trim(),
  }

  return AnalysisSchema.parse(result)
}
