import 'dotenv/config'
import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import type { ElectronApplication, Page } from '@playwright/test'

const SUPABASE_URL = 'https://rzjbfqgkprozguyjrxbp.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6amJmcWdrcHJvemd1eWpyeGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTU0OTIsImV4cCI6MjA5MzgzMTQ5Mn0.PN4vN-_MQkYSGqsKaVT1XFK27BVDW0dnlX9BXXcGhVQ'

async function signInWithPassword(): Promise<{ access_token: string; refresh_token: string }> {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) throw new Error('TEST_USER_EMAIL / TEST_USER_PASSWORD not set in .env')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Supabase signIn failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { access_token: string; refresh_token: string }
  return { access_token: data.access_token, refresh_token: data.refresh_token }
}

let app: ElectronApplication
let page: Page

test.describe.serial('LTT Desktop core flows', () => {
  test.beforeAll(async () => {
    // Get a valid session before launching — we'll inject it via IPC after launch.
    // This avoids the store pre-seed approach, which gets cleared by refreshSession()
    // on startup when the token can't be refreshed via Supabase's OAuth flow.
    const session = await signInWithPassword()

    app = await electron.launch({
      args: [path.join(__dirname, '../dist-electron/index.js')],
      env: { ...process.env },
    })

    // Menubar app — window is created (preloadWindow: true) but hidden; show it for Playwright
    page = await app.firstWindow()
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.show()
      win?.focus()
    })
    await page.waitForLoadState('domcontentloaded')

    // Wait for the login screen to confirm React has mounted and useAuth's listener is live
    await page.waitForSelector('button', { timeout: 10_000 })

    // Send auth-success directly to the renderer via webContents — same path as real OAuth flow.
    // The preload bridges webContents.send('auth-success') → ltt.on('auth-success') → setSession().
    await app.evaluate(({ BrowserWindow }, s) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('auth-success', s)
    }, session)
  })

  test.afterAll(async () => {
    await app.close()
  })

  test('app launches and shows timer tab', async () => {
    await page.screenshot({ path: 'test-results/launch.png' })
    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 30_000 })
  })

  test('add a new manual task — appears in list', async () => {
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText('Add Task')).toBeVisible()

    await page.getByRole('button', { name: 'Manual' }).click()

    const taskName = `Test Task ${Date.now()}`
    await page.getByPlaceholder('Task name…').fill(taskName)
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByText("Today's Tasks")).toBeVisible()
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })
  })

  test('entries load with descriptions visible', async () => {
    // Test user starts with no entries — the previous test added one, so .desc-field should now exist
    await page.waitForSelector('.desc-field', { timeout: 10_000 })
    const count = await page.locator('.desc-field').count()
    expect(count).toBeGreaterThan(0)
  })

  test('add a second task — existing descriptions remain intact', async () => {
    const existingDescs = await page.locator('.desc-field').allTextContents()

    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('button', { name: 'Manual' }).click()

    const taskName = `Test Task ${Date.now()}`
    await page.getByPlaceholder('Task name…').fill(taskName)
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })

    const updatedDescs = await page.locator('.desc-field').allTextContents()
    for (const desc of existingDescs) {
      if (desc.trim()) expect(updatedDescs).toContain(desc)
    }
  })

  test('start timer on an entry', async () => {
    const playBtn = page.locator('button', { hasText: '▶' }).first()
    await expect(playBtn).toBeVisible({ timeout: 5_000 })
    await playBtn.click()
    await expect(page.locator('button', { hasText: '⏸' }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('pause timer — time persists and does not revert to zero', async () => {
    await page.waitForTimeout(2_000)

    const pauseBtn = page.locator('button', { hasText: '⏸' }).first()
    await expect(pauseBtn).toBeVisible()
    await pauseBtn.click()

    await expect(page.locator('button', { hasText: '▶' }).first()).toBeVisible({ timeout: 5_000 })

    const timeSpan = page.locator('span[style*="tabular-nums"]').first()
    await expect(timeSpan).toBeVisible()
    const timeText = await timeSpan.textContent()
    expect(timeText).toBeTruthy()
    expect(timeText).not.toBe('0:00')
    expect(timeText).not.toBe('0:00:00')
  })

  test('edit a description — saves after blur', async () => {
    const descField = page.locator('.desc-field').first()
    const testDesc = `e2e-desc-${Date.now()}`

    await descField.click()
    await page.keyboard.press('Meta+A')
    await page.keyboard.type(testDesc)
    await page.keyboard.press('Escape')

    await page.waitForTimeout(500)
    await expect(descField).toHaveText(testDesc)
  })
})
