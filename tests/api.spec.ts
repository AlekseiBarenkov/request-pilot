import { expect, test } from '@playwright/test'

import { ApiErrorResponseSchema, ConfigResponseSchema } from '../shared/schemas/api'

test('config reports the active provider', async ({ request }, testInfo) => {
  const isDemo = testInfo.project.name.startsWith('demo')
  const response = await request.get('/api/config')

  expect(response.status()).toBe(200)

  const config = ConfigResponseSchema.parse(await response.json())

  expect(config.provider).toBe(isDemo ? 'demo' : 'fake')
  expect(config.mode).toBe(isDemo ? 'demo' : 'live')
  expect(config.model).toBe(isDemo ? null : 'fake')
  expect(config.maxTextLength).toBe(8000)
})

test('rejects empty, malformed and oversized requests', async ({ request }) => {
  const empty = await request.post('/api/analyze', { data: { text: '   ' } })
  expect(empty.status()).toBe(400)
  expect(ApiErrorResponseSchema.parse(await empty.json()).error.code).toBe('TEXT_REQUIRED')

  const wrongType = await request.post('/api/analyze', { data: { text: 42 } })
  expect(wrongType.status()).toBe(400)
  expect(ApiErrorResponseSchema.parse(await wrongType.json()).error.code).toBe('INVALID_REQUEST')

  const extraField = await request.post('/api/analyze', { data: { text: 'текст', extra: true } })
  expect(extraField.status()).toBe(400)
  expect(ApiErrorResponseSchema.parse(await extraField.json()).error.code).toBe('INVALID_REQUEST')

  const tooLong = await request.post('/api/analyze', { data: { text: 'а'.repeat(8001) } })
  expect(tooLong.status()).toBe(413)
  expect(ApiErrorResponseSchema.parse(await tooLong.json()).error.code).toBe('TEXT_TOO_LONG')

  const brokenJson = await request.post('/api/analyze', {
    headers: { 'Content-Type': 'application/json' },
    data: '{"text":',
  })
  expect(brokenJson.status()).toBe(400)
  expect(ApiErrorResponseSchema.parse(await brokenJson.json()).error.code).toBe('INVALID_REQUEST')
})
