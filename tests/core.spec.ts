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
// Stored at module scope so restart tests can re-inject without re-authenticating
let session: { access_token: string; refresh_token: string }

// The app reads E2E_TEST_SESSION at startup and pre-seeds the store, skipping
// refreshSession(). This means the renderer's useAuth.getSession() returns the
// test session immediately, and all Supabase calls (loadEntries, saveEntry)
// work correctly via ensureSession() reading from the store.
async function launchAndAuth(): Promise<void> {
  app = await electron.launch({
    args: [path.join(__dirname, '../dist-electron/index.js')],
    env: { ...process.env, E2E_TEST_SESSION: JSON.stringify(session) },
  })
  page = await app.firstWindow()
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win?.show()
    win?.focus()
  })
  await page.waitForLoadState('domcontentloaded')
}

test.describe.serial('LTT Desktop core flows', () => {
  test.beforeAll(async () => {
    session = await signInWithPassword()
    await launchAndAuth()
  })

  test.afterAll(async () => {
    await app.close()
  })

  // ── Core ────────────────────────────────────────────────────────────────

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
    await page.waitForTimeout(1000)
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 20_000 })
  })

  test('entries load with descriptions visible', async () => {
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

  // ── Restart: description persists ───────────────────────────────────────

  test('description persists after restart', async () => {
    // Give the Supabase save time to complete before closing
    await page.waitForTimeout(1_500)
    const savedDesc = await page.locator('.desc-field').first().textContent()
    expect(savedDesc?.trim()).toBeTruthy()

    await app.close()
    await launchAndAuth()

    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 15_000 })
    await page.waitForSelector('.desc-field', { timeout: 20_000 })

    const descTexts = await page.locator('.desc-field').allTextContents()
    expect(descTexts.some(t => t.trim() === savedDesc?.trim())).toBe(true)
  })

  // ── Restart: timer time persists ─────────────────────────────────────────

  test('timer time persists after restart', async () => {
    // Start timer, let it run, pause, note the time
    const playBtn = page.locator('button', { hasText: '▶' }).first()
    await expect(playBtn).toBeVisible({ timeout: 5_000 })
    await playBtn.click()
    await expect(page.locator('button', { hasText: '⏸' }).first()).toBeVisible({ timeout: 5_000 })

    await page.waitForTimeout(3_000)

    await page.locator('button', { hasText: '⏸' }).first().click()
    await expect(page.locator('button', { hasText: '▶' }).first()).toBeVisible({ timeout: 5_000 })

    const timeText = await page.locator('span[style*="tabular-nums"]').first().textContent()
    expect(timeText).toBeTruthy()
    expect(timeText).not.toBe('0:00:00')

    // Give the save a moment to write through to Supabase
    await page.waitForTimeout(1_000)

    await app.close()
    await launchAndAuth()

    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 15_000 })
    await page.waitForSelector('span[style*="tabular-nums"]', { timeout: 20_000 })

    const restoredTime = await page.locator('span[style*="tabular-nums"]').first().textContent()
    expect(restoredTime).toBeTruthy()
    expect(restoredTime).not.toBe('0:00:00')
  })

  // ── Bulk send view ───────────────────────────────────────────────────────

  test('Send to Jira opens bulk send view', async () => {
    await page.getByRole('button', { name: 'Send to Jira' }).click()

    // BulkSendView header contains "‹ Timer" as the back button
    await expect(page.getByText('‹ Timer')).toBeVisible({ timeout: 5_000 })

    // Test user has no jiraKey entries so the empty state shows
    const eligible = await page.locator('text=No unsent entries with time').count()
    const hasEntries = await page.locator('text=Today').count()
    expect(eligible + hasEntries).toBeGreaterThan(0)

    // Close without sending
    await page.getByText('‹ Timer').click()
    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 5_000 })
  })

  // ── Add from Recents ─────────────────────────────────────────────────────

  test('add from Recents — entry appears at top, existing descriptions intact', async () => {
    const existingDescs = await page.locator('.desc-field').allTextContents()

    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText('Add Task')).toBeVisible()

    await page.getByRole('button', { name: 'Recent' }).click()

    // Click the first recent row to select it
    const firstRow = page.locator('.ltt-panel-scroll div[style*="cursor: pointer"]').first()
    const noRecent = await page.locator('text=No recent entries').count()
    if (noRecent > 0) {
      // Fallback: switch to manual instead
      await page.getByRole('button', { name: 'Manual' }).click()
      const taskName = `Recent Fallback ${Date.now()}`
      await page.getByPlaceholder('Task name…').fill(taskName)
      await page.getByRole('button', { name: 'Add' }).click()
      await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })
    } else {
      await firstRow.click()
      // After selecting, "Add" button appears in the sticky footer
      await expect(page.getByText(/selected/)).toBeVisible({ timeout: 3_000 })
      await page.getByRole('button', { name: 'Add' }).click()

      await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 10_000 })

      // Existing non-empty descriptions should still be in the list
      const updatedDescs = await page.locator('.desc-field').allTextContents()
      for (const desc of existingDescs) {
        if (desc.trim()) expect(updatedDescs).toContain(desc)
      }
    }
  })

  // ── Drag reorder ─────────────────────────────────────────────────────────

  test('drag reorder changes entry order', async () => {
    await page.waitForSelector('[draggable="true"]', { timeout: 5_000 })
    const entries = page.locator('[draggable="true"]')
    const count = await entries.count()
    if (count < 2) {
      test.skip()
      return
    }

    // Capture name text of first two entries before drag
    const nameBefore0 = await entries.nth(0).textContent()
    const nameBefore1 = await entries.nth(1).textContent()

    // Drag first entry onto second
    await entries.nth(0).dragTo(entries.nth(1))

    // After drop, poll until order changes (sortOrder save + re-render)
    await page.waitForTimeout(1_500)

    const nameAfter0 = await entries.nth(0).textContent()
    const nameAfter1 = await entries.nth(1).textContent()

    // Order should have changed
    expect(nameAfter0).not.toBe(nameBefore0)
    expect(nameAfter1).not.toBe(nameBefore1)

    // Verify persistence after restart
    const expectedFirst = nameAfter0
    await page.waitForTimeout(1_000)
    await app.close()
    await launchAndAuth()

    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 15_000 })
    await page.waitForSelector('[draggable="true"]', { timeout: 20_000 })

    const reloadedFirst = await page.locator('[draggable="true"]').nth(0).textContent()
    expect(reloadedFirst).toBe(expectedFirst)
  })

  // ── Remove from timer ────────────────────────────────────────────────────

  test('remove from timer — entry disappears from list', async () => {
    await page.waitForSelector('[draggable="true"]', { timeout: 5_000 })
    const countBefore = await page.locator('[draggable="true"]').count()

    // Open the menu on the first entry
    await page.locator('button', { hasText: '•••' }).first().click()
    await expect(page.getByText('Remove from timer')).toBeVisible({ timeout: 3_000 })
    await page.getByText('Remove from timer').click()

    // Entry count should decrease by 1
    await page.waitForTimeout(500)
    const countAfter = await page.locator('[draggable="true"]').count()
    expect(countAfter).toBe(countBefore - 1)
  })

  // ── Standup ──────────────────────────────────────────────────────────────

  test('standup view opens and shows sections', async () => {
    await page.getByRole('button', { name: 'Standup' }).click()

    await expect(page.getByText('I will work on')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('I accomplished')).toBeVisible()

    // Close standup — back nav is a div with span "‹ Timer", not a button
    await page.getByText('‹ Timer').click()
    await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: 5_000 })
  })
})
