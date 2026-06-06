import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  // Electron is launched manually in each test file via _electron from @playwright/test.
  // No browser project needed — the empty projects array lets Playwright discover tests normally.
})
