export const CATEGORY = {
  washing_machine: 'Стиральная машина',
  refrigerator: 'Холодильник',
  dishwasher: 'Посудомоечная машина',
  stove: 'Плита и варочная панель',
  oven: 'Духовой шкаф',
  small_appliance: 'Мелкая бытовая техника',
} as const

export type CategoryId = keyof typeof CATEGORY

export const REQUEST_TYPE = {
  repair: 'Ремонт',
  maintenance: 'Обслуживание',
  warranty: 'Гарантийный вопрос',
  other: 'Другое',
} as const

export type RequestType = keyof typeof REQUEST_TYPE

export const URGENCY = {
  normal: 'Обычная',
  urgent: 'Срочная',
  unknown: 'Не определена',
} as const

export type Urgency = keyof typeof URGENCY

export const ANALYSIS_MODE = {
  demo: 'demo',
  live: 'live',
} as const

export type AnalysisMode = keyof typeof ANALYSIS_MODE

export const PROVIDER_META = {
  demo: { label: 'Демо-режим', tone: 'demo' },
  deepseek: { label: 'DeepSeek', tone: 'live' },
  fake: { label: 'Тестовый режим', tone: 'test' },
} as const

export type ProviderId = keyof typeof PROVIDER_META

export const CATEGORY_IDS = Object.keys(CATEGORY) as [CategoryId, ...CategoryId[]]
export const REQUEST_TYPE_IDS = Object.keys(REQUEST_TYPE) as [RequestType, ...RequestType[]]
export const URGENCY_IDS = Object.keys(URGENCY) as [Urgency, ...Urgency[]]
export const PROVIDER_IDS = Object.keys(PROVIDER_META) as [ProviderId, ...ProviderId[]]

export const MAX_TEXT_LENGTH = 8000
export const MAX_LIST_ITEMS = 10
export const HISTORY_LIMIT = 100
export const SCHEMA_VERSION = 1
export const STORAGE_DB_NAME = 'request-pilot'
export const STORAGE_STORE_NAME = 'db'
export const STORAGE_CURRENT_KEY = 'current'
