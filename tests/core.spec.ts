import 'dotenv/config'
import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'
import type { ElectronApplication, Page } from '@playwright/test'

const SUPABASE_URL = 'https://rzjbfqgkprozguyjrxbp.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6amJmcWdrcHJvemd1eWpyeGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTU0OTIsImV4cCI6MjA5MzgzMTQ5Mn0.PN4vN-_MQkYSGqsKaVT1XFK27BVDW0dnlX9BXXcGhVQ'

// electron-store writes to this file on macOS
const STORE_PATH = path.join(os.homedir(), 'Library', 'Application Support', 'ltt-desktop', 'config.json')

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

function readStore(): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) } catch { return {} }
}

function writeStore(data: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(data))
}

let app: ElectronApplication
let page: Page
let originalStore: Record<string, unknown>

test.describe.serial('LTT Desktop core flows', () => {
  test.beforeAll(async () => {
    // Save and restore the dev session so tests don't disturb the real account
    originalStore = readStore()

    const session = await signInWithPassword()
    writeStore({ ...originalStore, session })

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
  })

  test.afterAll(async () => {
    await app.close()
    // Restore original store so the dev session is unaffected
    writeStore(originalStore)
  })

  test('app launches and shows timer tab', async () => {
    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 10_000 })
  })

  test('entries load with descriptions visible', async () => {
    await page.waitForSelector('.desc-field', { timeout: 15_000 })
    const count = await page.locator('.desc-field').count()
    expect(count).toBeGreaterThan(0)
  })

  test('add a new manual task — appears at top, existing descriptions intact', async () => {
    await page.waitForSelector('.desc-field', { timeout: 10_000 })
    const existingDescs = await page.locator('.desc-field').allTextContents()

    // Open add panel
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText('Add Task')).toBeVisible()

    // Switch to manual mode
    await page.getByRole('button', { name: 'Manual' }).click()

    const taskName = `Test Task ${Date.now()}`
    await page.getByPlaceholder('Task name…').fill(taskName)
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByText("Today's Tasks")).toBeVisible()
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })

    // Existing non-empty descriptions should still appear somewhere in the list
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
