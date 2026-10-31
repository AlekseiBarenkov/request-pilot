import { DEMO_EXAMPLES } from '../../../shared/examples'
import type { Analysis } from '../../../shared/schemas/analysis'
import type { SavedAnalysis } from '../../../shared/schemas/saved'
import { listAnalyses, saveAnalysis } from '../../data/storage/analysesRepo'
import { analyzeRequest } from '../../lib/api'

type ExampleSeed = {
  exampleId: string
  daysAgo: number
  edited?: boolean
}

const EXAMPLE_SEEDS: readonly ExampleSeed[] = [
  { exampleId: 'full-request', daysAgo: 0 },
  { exampleId: 'short-request', daysAgo: 1 },
  { exampleId: 'warranty-question', daysAgo: 2 },
  { exampleId: 'urgent-fridge', daysAgo: 3 },
  { exampleId: 'multiple-faults', daysAgo: 4 },
  { exampleId: 'typos', daysAgo: 5, edited: true },
  { exampleId: 'prompt-injection', daysAgo: 7 },
  { exampleId: 'out-of-scope', daysAgo: 8 },
]

type SyntheticSeed = {
  id: string
  daysAgo: number
  sourceText: string
  analysis: Analysis
}

const SYNTHETIC_SEEDS: readonly SyntheticSeed[] = [
  {
    id: 'demo-stove',
    daysAgo: 9,
    sourceText: 'Здравствуйте! Плита не нагревается, нужен мастер. Телефон +7 900 123-45-67, адрес ул. Заводская, 3.',
    analysis: {
      summary: 'Клиент сообщает, что плита не нагревается. Указаны телефон и адрес.',
      category: { value: 'stove', evidence: { snippet: 'Плита', verified: true } },
      requestType: 'repair',
      customer: {
        name: { value: null, evidence: null },
        phone: {
          value: '+7 900 123-45-67',
          evidence: { snippet: '+7 900 123-45-67', verified: true },
        },
        address: {
          value: 'ул. Заводская, 3',
          evidence: { snippet: 'ул. Заводская, 3', verified: true },
        },
      },
      problem: 'Плита не нагревается.',
      urgency: { value: 'normal', evidence: null },
      missing: [],
      questions: [],
      draftReply:
        'Здравствуйте! Спасибо за обращение. Плита не нагревается. Стоимость и возможность ремонта уточним после диагностики, время визита согласует сотрудник.',
    },
  },
  {
    id: 'demo-oven',
    daysAgo: 10,
    sourceText: 'Духовой шкаф не закрывается, дверца хлопает. Мастер нужен на завтра. Телефон +7 900 765-43-21.',
    analysis: {
      summary: 'Клиент сообщает, что духовой шкаф не закрывается и дверца хлопает. Указан телефон.',
      category: { value: 'oven', evidence: { snippet: 'Духовой шкаф', verified: true } },
      requestType: 'repair',
      customer: {
        name: { value: null, evidence: null },
        phone: {
          value: '+7 900 765-43-21',
          evidence: { snippet: '+7 900 765-43-21', verified: true },
        },
        address: { value: null, evidence: null },
      },
      problem: 'Духовой шкаф не закрывается, дверца хлопает.',
      urgency: { value: 'normal', evidence: null },
      missing: ['адрес'],
      questions: ['Уточните адрес, по которому находится техника.'],
      draftReply:
        'Здравствуйте! Спасибо за обращение. Духовой шкаф не закрывается, дверца хлопает. Чтобы оформить заявку, нужен адрес. Стоимость и возможность ремонта уточним после диагностики, время визита согласует сотрудник.',
    },
  },
  {
    id: 'demo-microwave',
    daysAgo: 12,
    sourceText: 'Микроволновка куплена месяц назад, перестала греть. Гарантия действует? Телефон +7 900 111-22-33.',
    analysis: {
      summary: 'Клиент спрашивает о гарантии: микроволновка куплена месяц назад и перестала греть. Указан телефон.',
      category: { value: 'small_appliance', evidence: { snippet: 'Микроволновка', verified: true } },
      requestType: 'warranty',
      customer: {
        name: { value: null, evidence: null },
        phone: {
          value: '+7 900 111-22-33',
          evidence: { snippet: '+7 900 111-22-33', verified: true },
        },
        address: { value: null, evidence: null },
      },
      problem: 'Микроволновка перестала греть.',
      urgency: { value: 'normal', evidence: null },
      missing: ['адрес', 'документы на технику', 'дата покупки'],
      questions: [
        'Уточните адрес, по которому находится техника.',
        'Подготовьте, пожалуйста, документы на технику.',
        'Напишите точную дату покупки.',
      ],
      draftReply:
        'Здравствуйте! Спасибо за обращение. Микроволновка перестала греть, вы спрашиваете о гарантии. Чтобы оформить заявку, нужны адрес, документы на технику и дата покупки. Условия гарантии проверим по документам и обстоятельствам обращения. Стоимость и возможность ремонта уточним после диагностики.',
    },
  },
]

export type SeedResult = {
  added: number
  skipped: number
}

export const DEMO_SEED_IDS: readonly string[] = [
  ...EXAMPLE_SEEDS.map((seed) => `demo-${seed.exampleId}`),
  ...SYNTHETIC_SEEDS.map((seed) => seed.id),
]

export async function seedDemoHistory(): Promise<SeedResult> {
  const existing = await listAnalyses()
  const existingIds = new Set(existing.map((record) => record.id))
  const now = Date.now()
  let added = 0
  let skipped = 0

  for (const [index, seed] of EXAMPLE_SEEDS.entries()) {
    const example = DEMO_EXAMPLES.find((item) => item.id === seed.exampleId)

    if (!example) {
      continue
    }

    const id = `demo-${seed.exampleId}`

    if (existingIds.has(id)) {
      skipped += 1
      continue
    }

    const result = await analyzeRequest(example.text)

    if (result.mode !== 'demo') {
      throw new Error('Тестовые данные можно добавить только в демо-режиме.')
    }

    const confirmedAt = new Date(now - seed.daysAgo * 86_400_000 - index * 1_800_000).toISOString()
    const createdAt = new Date(new Date(confirmedAt).getTime() - 300_000).toISOString()
    const analysis = seed.edited ? editTyposAnalysis(result.analysis) : result.analysis
    const record: SavedAnalysis = {
      id,
      mode: result.mode,
      provider: result.provider,
      model: result.model,
      sourceText: example.text,
      createdAt,
      confirmedAt,
      modelAnalysis: result.analysis,
      analysis,
    }

    await saveAnalysis(record)
    existingIds.add(id)
    added += 1
  }

  for (const [index, seed] of SYNTHETIC_SEEDS.entries()) {
    if (existingIds.has(seed.id)) {
      skipped += 1
      continue
    }

    const confirmedAt = new Date(now - seed.daysAgo * 86_400_000 - index * 1_800_000).toISOString()
    const createdAt = new Date(new Date(confirmedAt).getTime() - 300_000).toISOString()
    const record: SavedAnalysis = {
      id: seed.id,
      mode: 'demo',
      provider: 'demo',
      model: null,
      sourceText: seed.sourceText,
      createdAt,
      confirmedAt,
      modelAnalysis: seed.analysis,
      analysis: seed.analysis,
    }

    await saveAnalysis(record)
    existingIds.add(seed.id)
    added += 1
  }

  return { added, skipped }
}

function editTyposAnalysis(model: Analysis): Analysis {
  return {
    ...model,
    summary: `${model.summary} Адрес уточнён сотрудником.`,
    customer: {
      ...model.customer,
      address: { value: 'ул. Садовая, 7', evidence: null },
    },
  }
}
