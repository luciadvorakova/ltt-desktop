import { BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'
import type { TimeEntry } from '../types/index'

let notificationWindow: BrowserWindow | null = null
const dismissed = new Set<string>()

export function isDismissed(gcalEventId: string, type: '10min' | '1min'): boolean {
  return dismissed.has(`${gcalEventId}:${type}`)
}

export function clearDismissed(): void {
  dismissed.clear()
}

export function showMeetingNotification(entry: TimeEntry, type: '10min' | '1min'): void {
  if (entry.gcalEventId && dismissed.has(`${entry.gcalEventId}:${type}`)) return

  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close()
  }

  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
  const winWidth = 300
  const winHeight = type === '1min' ? 160 : 130

  notificationWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth - 20,
    y: 48,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })

  const params = new URLSearchParams({
    type,
    entryId: String(entry.id),
    name: entry.name,
    description: entry.jiraDesc || '',
    ts: String(entry.ts),
    gcalEventId: entry.gcalEventId || '',
  })

  const devUrl = process.env['VITE_DEV_SERVER_URL']
  if (devUrl) {
    notificationWindow.loadURL(`${devUrl}notification.html?${params}`)
  } else {
    notificationWindow.loadFile(path.join(__dirname, '..', 'dist', 'notification.html'), {
      search: `?${params}`,
    })
  }
}

let notificationIpcRegistered = false

export function setupNotificationIpc(mainWindow: BrowserWindow): void {
  if (notificationIpcRegistered) return
  notificationIpcRegistered = true

  ipcMain.on('notification:close', (_e, gcalEventId?: string, type?: string) => {
    if (gcalEventId && type) dismissed.add(`${gcalEventId}:${type}`)
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.close()
      notificationWindow = null
    }
  })

  ipcMain.on('notification:start-tracking', (_e, entryId: string, gcalEventId?: string) => {
    if (gcalEventId) {
      dismissed.add(`${gcalEventId}:10min`)
      dismissed.add(`${gcalEventId}:1min`)
    }
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.close()
      notificationWindow = null
    }
    mainWindow.webContents.send('start-tracking-from-notification', entryId)
    if (!mainWindow.isVisible()) mainWindow.show()
  })
}
