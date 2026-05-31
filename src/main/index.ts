import 'dotenv/config'
import { app, nativeImage, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { menubar } from 'menubar'
import { handleAuthCallback, refreshSession, startSessionRefreshInterval, authEmitter } from './auth'
import { handleJiraCallback, startJiraRefreshInterval } from './jira-auth'
import { handleGCalCallback, gcalAuthEmitter } from './gcal-auth'
import { syncGoogleCalendar } from './gcal'
import { registerIpcHandlers } from './ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

app.setAsDefaultProtocolClient('ltt')

const trayIcon = nativeImage.createFromPath(
  path.join(__dirname, '../../public/digismoothie-logo-small.png')
).resize({ width: 22, height: 22 })
trayIcon.setTemplateImage(true)
console.log('[MAIN] trayIcon path:', path.join(__dirname, '../../public/digismoothie-logo-small.png'), 'empty:', trayIcon.isEmpty())

const preloadPath = path.join(__dirname, 'preload.js')
console.log('[MAIN] preload path:', preloadPath)

const mb = menubar({
  index: VITE_DEV_SERVER_URL || `file://${path.join(RENDERER_DIST, 'index.html')}`,
  icon: trayIcon,
  browserWindow: {
    width: 380,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
    },
  },
  preloadWindow: true,
  showDockIcon: false,
})

app.on('web-contents-created', (_event, contents) => {
  contents.session.setPreloads([preloadPath])
})

let ipcRegistered = false

mb.on('ready', () => {
  console.log('[MAIN] menubar ready')
  refreshSession()
  startSessionRefreshInterval()
  startJiraRefreshInterval()
  authEmitter.on('auth-success', (session) => {
    console.log('[AUTH] auth-success received in index.ts, win exists:', !!mb.window)
    mb.window?.webContents.send('auth-success', session)
    console.log('[AUTH] sent to renderer')
  })
  gcalAuthEmitter.on('gcal-auth-success', () => {
    mb.window?.webContents.send('gcal-auth-success')
  })
  mb.on('show', async () => {
    mb.window?.webContents.send('window-show')
    const synced = await syncGoogleCalendar()
    if (synced) mb.window?.webContents.send('window-show')
  })
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mb.window?.webContents.toggleDevTools()
  })
})

mb.on('after-create-window', () => {
  if (!ipcRegistered) {
    registerIpcHandlers()
    ipcRegistered = true
    console.log('[MAIN] IPC registered')
  }
  console.log('[MAIN] window created, preload:', mb.window?.webContents.getURL())
  if (VITE_DEV_SERVER_URL) mb.window?.webContents.openDevTools({ mode: 'detach' })
  mb.window?.webContents.on('did-finish-load', () => {
    mb.window?.webContents.send('main-process-message', new Date().toLocaleString())
    mb.window?.webContents.executeJavaScript('window.ltt').then(result => {
      console.log('[MAIN] window.ltt from main:', result)
    })
  })
})

// macOS: auth redirect arrives via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (url.startsWith('ltt://auth')) {
    handleAuthCallback(url).then((session) => {
      if (session) mb.window?.webContents.send('auth-success', session)
    })
  } else if (url.startsWith('ltt://jira-auth')) {
    handleJiraCallback(url).then(() => {
      mb.window?.webContents.send('jira-auth-success')
    })
  } else if (url.startsWith('ltt://gcal-auth')) {
    handleGCalCallback(url)
  }
})

// Windows/Linux: auth redirect arrives as a second-instance argv
app.on('second-instance', (_event, argv) => {
  const url = argv.find((arg) => arg.startsWith('ltt://'))
  if (url?.startsWith('ltt://auth')) {
    handleAuthCallback(url).then((session) => {
      if (session) mb.window?.webContents.send('auth-success', session)
    })
  }
})
