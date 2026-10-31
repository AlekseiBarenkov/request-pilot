import { defineConfig } from '@playwright/test'

const DEMO_URL = 'http://127.0.0.1:3111'
const FAKE_URL = 'http://127.0.0.1:3112'

const TEST_LIMITS = {
  AI_DAILY_REQUEST_LIMIT: '1000',
  RATE_LIMIT_PER_MINUTE: '1000',
  MAX_CONCURRENT_AI_REQUESTS: '20',
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    channel: 'chrome',
    timezoneId: 'Asia/Yekaterinburg',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node dist-server/index.js',
      port: 3111,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        AI_PROVIDER: 'demo',
        PORT: '3111',
        DEEPSEEK_API_KEY: '',
        ...TEST_LIMITS,
      },
    },
    {
      command: 'node dist-server/index.js',
      port: 3112,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        AI_PROVIDER: 'fake',
        PORT: '3112',
        DEEPSEEK_API_KEY: '',
        ...TEST_LIMITS,
      },
    },
  ],
  projects: [
    {
      name: 'demo-desktop',
      testMatch: ['**/api.spec.ts', '**/demo.spec.ts'],
      use: {
        baseURL: DEMO_URL,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'demo-mobile',
      testMatch: ['**/api.spec.ts', '**/demo.spec.ts'],
      use: {
        baseURL: DEMO_URL,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'fake-desktop',
      testMatch: ['**/api.spec.ts', '**/fake.spec.ts'],
      use: {
        baseURL: FAKE_URL,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'fake-mobile',
      testMatch: ['**/api.spec.ts', '**/fake.spec.ts'],
      use: {
        baseURL: FAKE_URL,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
