import { expect, test } from '@playwright/test'

import { DEMO_EXAMPLES } from '../shared/examples'
import { AnalyzeResponseSchema, ApiErrorResponseSchema } from '../shared/schemas/api'

test('demo API returns a validated prepared analysis', async ({ request }) => {
  const example = DEMO_EXAMPLES[0]

  if (!example) {
    throw new Error('Демонстрационный пример не найден.')
  }

  const response = await request.post('/api/analyze', { data: { text: example.text } })
  expect(response.status()).toBe(200)

  const payload = AnalyzeResponseSchema.parse(await response.json())
  expect(payload.mode).toBe('demo')
  expect(payload.provider).toBe('demo')
  expect(payload.analysis.category.value).toBe('washing_machine')
  expect(payload.analysis.customer.name.value).toBe('Анна Петрова')
  expect(payload.analysis.customer.phone.value).toBe('+7 912 345-67-89')
})

test('demo API rejects text outside the prepared examples', async ({ request }) => {
  const response = await request.post('/api/analyze', {
    data: { text: 'Свой текст, которого нет среди примеров.' },
  })

  expect(response.status()).toBe(422)
  expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe('DEMO_EXAMPLE_REQUIRED')
})

test('demo flow: example, result, save and history', async ({ page }) => {
  await page.goto('/')
  await page.locator('#example-select').click()
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: '1. Полная заявка' })
    .click()

  await expect(page.locator('#source-text')).toHaveValue(/Анна Петрова/)
  await page.getByRole('button', { name: 'Разобрать обращение' }).click()

  await expect(page.locator('#analysis-summary')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Результат разбора' })).toBeVisible()

  await page.getByRole('button', { name: 'Подтвердить и сохранить' }).click()
  await page.waitForURL(/\/history\/[^/]+$/)
  await expect(page.getByRole('heading', { name: /^Разбор от/ })).toBeVisible()

  await page.goto('/history')
  await expect(page.locator('.history-card').filter({ hasText: 'Анна Петрова' })).toBeVisible()
})
