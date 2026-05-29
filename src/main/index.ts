import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { handleAuthCallback, startSessionRefreshInterval } from './auth'
import { registerIpcHandlers } from './ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

app.setAsDefaultProtocolClient('ltt')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// macOS: auth redirect arrives via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (url.startsWith('ltt://auth')) {
    handleAuthCallback(url).then((session) => {
      if (session) win?.webContents.send('auth-success', session)
    })
  }
})

// Windows/Linux: auth redirect arrives as a second-instance argv
app.on('second-instance', (_event, argv) => {
  const url = argv.find((arg) => arg.startsWith('ltt://'))
  if (url?.startsWith('ltt://auth')) {
    handleAuthCallback(url).then((session) => {
      if (session) win?.webContents.send('auth-success', session)
    })
  }
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  startSessionRefreshInterval()
})
