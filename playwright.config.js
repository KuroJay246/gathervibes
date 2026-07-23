/* global process */
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  globalSetup: './scripts/e2e/globalSetup.mjs',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: 'local-emulator-key',
      VITE_FIREBASE_AUTH_DOMAIN: '127.0.0.1',
      VITE_FIREBASE_PROJECT_ID: 'gathervibeshub',
      VITE_FIREBASE_STORAGE_BUCKET: 'local.invalid',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      VITE_FIREBASE_APP_ID: '1:1234567890:web:phase23p',
      VITE_FIREBASE_USE_EMULATORS: 'true',
      VITE_SENTRY_DSN: '',
    },
  },
})
