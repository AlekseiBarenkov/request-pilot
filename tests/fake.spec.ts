import { expect, test } from '@playwright/test'

import { AnalyzeResponseSchema, ApiErrorResponseSchema } from '../shared/schemas/api'

test('fake API maps provider failures to stable error codes', async ({ request }) => {
  const success = await request.post('/api/analyze', {
    data: { text: 'Тестовое обращение для проверки.' },
  })
  expect(success.status()).toBe(200)
  expect(AnalyzeResponseSchema.parse(await success.json()).analysis.category.value).toBe('washing_machine')

  const providerError = await request.post('/api/analyze', { data: { text: '[[fake:error]]' } })
  expect(providerError.status()).toBe(502)
  expect(ApiErrorResponseSchema.parse(await providerError.json()).error.code).toBe('PROVIDER_UNAVAILABLE')

  const timeout = await request.post('/api/analyze', { data: { text: '[[fake:timeout]]' } })
  expect(timeout.status()).toBe(504)
  expect(ApiErrorResponseSchema.parse(await timeout.json()).error.code).toBe('PROVIDER_TIMEOUT')

  const invalidJson = await request.post('/api/analyze', { data: { text: '[[fake:invalid-json]]' } })
  expect(invalidJson.status()).toBe(502)
  expect(ApiErrorResponseSchema.parse(await invalidJson.json()).error.code).toBe('INVALID_MODEL_RESPONSE')

  const badSchema = await request.post('/api/analyze', { data: { text: '[[fake:bad-schema]]' } })
  expect(badSchema.status()).toBe(502)
  expect(ApiErrorResponseSchema.parse(await badSchema.json()).error.code).toBe('INVALID_MODEL_RESPONSE')
})

test('fake API keeps an unverified evidence quote', async ({ request }) => {
  const response = await request.post('/api/analyze', {
    data: { text: 'Стиральная машина не сливает воду. [[fake:evidence-mismatch]]' },
  })

  expect(response.status()).toBe(200)

  const payload = AnalyzeResponseSchema.parse(await response.json())
  expect(payload.analysis.category.evidence?.verified).toBe(false)
})

test('fake flow: provider error is shown with retry', async ({ page }) => {
  await page.goto('/')
  await page.locator('#source-text').fill('Стиральная машина не сливает воду. [[fake:error]]')
  await page.getByRole('button', { name: 'Разобрать обращение' }).click()

  await expect(page.getByText('Провайдер временно недоступен. Попробуйте ещё раз.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible()
})

test('fake flow: cancel does not leave a result', async ({ page }) => {
  const source = 'Стиральная машина не сливает воду. [[fake:delay]]'
  await page.goto('/')
  await page.locator('#source-text').fill(source)
  await page.getByRole('button', { name: 'Разобрать обращение' }).click()

  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(page.getByText('Запрос отменён')).toBeVisible()
  await expect(page.locator('.analysis')).toHaveCount(0)
  await expect(page.locator('#source-text')).toHaveValue(source)
})
