import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import type { ElectronApplication, Page } from '@playwright/test'

// Requires a built app: run `npm run build` before `npm test`.
// Auth session is read from electron-store — tests assume the user is already logged in.

let app: ElectronApplication
let page: Page

test.describe.serial('LTT Desktop core flows', () => {
  test.beforeAll(async () => {
    app = await electron.launch({
      args: [path.join(__dirname, '../dist-electron/index.js')],
      env: { ...process.env },
    })
    // The app is a menubar app — window is created (preloadWindow: true) but hidden.
    // Show it so Playwright can interact with it.
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
    // Capture existing description texts keyed by position
    await page.waitForSelector('.desc-field', { timeout: 10_000 })
    const existingDescs = await page.locator('.desc-field').allTextContents()

    // Open add panel
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText('Add Task')).toBeVisible()

    // Switch to manual mode
    await page.getByRole('button', { name: 'Manual' }).click()

    // Type and submit
    const taskName = `Test Task ${Date.now()}`
    await page.getByPlaceholder('Task name…').fill(taskName)
    await page.getByRole('button', { name: 'Add' }).click()

    // Panel closes, new entry visible
    await expect(page.getByText("Today's Tasks")).toBeVisible()
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })

    // Existing descriptions should still be present somewhere in the list
    const descFields = page.locator('.desc-field')
    const updatedDescs = await descFields.allTextContents()
    for (const desc of existingDescs) {
      if (desc.trim()) {
        expect(updatedDescs).toContain(desc)
      }
    }
  })

  test('start timer on an entry', async () => {
    // Click the first available play button
    const playBtn = page.locator('button', { hasText: '▶' }).first()
    await expect(playBtn).toBeVisible({ timeout: 5_000 })
    await playBtn.click()

    // Pause button should appear indicating timer is running
    await expect(page.locator('button', { hasText: '⏸' }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('pause timer — time persists and does not revert to zero', async () => {
    // Let a couple of seconds accrue
    await page.waitForTimeout(2_000)

    // Pause
    const pauseBtn = page.locator('button', { hasText: '⏸' }).first()
    await expect(pauseBtn).toBeVisible()
    await pauseBtn.click()

    // Play button should return
    await expect(page.locator('button', { hasText: '▶' }).first()).toBeVisible({ timeout: 5_000 })

    // The time display on the first entry should be non-empty and non-zero
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
    // Select all and replace
    await page.keyboard.press('Meta+A')
    await page.keyboard.type(testDesc)
    await page.keyboard.press('Escape')

    // Brief wait for the blur handler to fire updateEntry
    await page.waitForTimeout(500)
    await expect(descField).toHaveText(testDesc)
  })
})
