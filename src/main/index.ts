import { app, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { menubar } from 'menubar'
import { handleAuthCallback, startSessionRefreshInterval, authEmitter } from './auth'
import { registerIpcHandlers } from './ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

app.setAsDefaultProtocolClient('ltt')

const trayIcon = nativeImage.createFromDataURL(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAPElEQVR42mNgGHbgPw5AdQMpsuA/iYAmhhJl+H8KAX0N/k8lMGrwcDJ46KVjmmZpmhZCNC02aVrQD1oAAKA5/C5Hrur7AAAAAElFTkSuQmCC'
)

const mb = menubar({
  index: VITE_DEV_SERVER_URL || `file://${path.join(RENDERER_DIST, 'index.html')}`,
  icon: trayIcon,
  browserWindow: {
    width: 380,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  },
  preloadWindow: true,
  showDockIcon: false,
})

mb.on('ready', () => {
  console.log('Menubar app is ready')
  registerIpcHandlers()
  startSessionRefreshInterval()
  authEmitter.on('auth-success', (session) => {
    console.log('[AUTH] auth-success received in index.ts, win exists:', !!mb.window)
    mb.window?.webContents.send('auth-success', session)
    console.log('[AUTH] sent to renderer')
  })
})

mb.on('after-create-window', () => {
  if (VITE_DEV_SERVER_URL) mb.window?.webContents.openDevTools({ mode: 'detach' })
  mb.window?.webContents.on('did-finish-load', () => {
    mb.window?.webContents.send('main-process-message', new Date().toLocaleString())
  })
})

// macOS: auth redirect arrives via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (url.startsWith('ltt://auth')) {
    handleAuthCallback(url).then((session) => {
      if (session) mb.window?.webContents.send('auth-success', session)
    })
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
