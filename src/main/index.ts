import 'dotenv/config'
import { app, nativeImage, globalShortcut, powerMonitor } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { menubar } from 'menubar'
import { autoUpdater } from 'electron-updater'
import { handleAuthCallback, refreshSession, startSessionRefreshInterval, authEmitter, ensureSession } from './auth'
import { jiraAuthEmitter, startJiraRefreshInterval, ensureJiraToken } from './jira-auth'
import { gcalAuthEmitter, ensureGCalToken, startGCalRefreshInterval } from './gcal-auth'
import { syncGoogleCalendar } from './gcal'
import { registerIpcHandlers } from './ipc'
import { setupNotificationIpc, clearDismissed, showStandupNotification } from './notification-window'
import { store } from './store'
import { supabase } from './supabase'
import { currentEntries } from './timer'
import { scheduleMeetingNotifications } from './meeting-notifications'

if (!app.isPackaged && !process.env.E2E_TEST_SESSION) {
  app.setPath('userData', path.join(app.getPath('userData'), 'dev'))
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const protocolSet = app.setAsDefaultProtocolClient('ltt')
console.log('[MAIN] setAsDefaultProtocolClient result:', protocolSet)

const trayIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'public/digismoothie-logo-small.png')
  : path.join(__dirname, '../public/digismoothie-logo-small.png')
const trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 9, height: 16 })
trayIcon.setTemplateImage(true)
console.log('[MAIN] trayIcon path:', trayIconPath, 'empty:', trayIcon.isEmpty())

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
  console.log('[MAIN] protocol registered:', app.isDefaultProtocolClient('ltt'))
  autoUpdater.checkForUpdatesAndNotify()
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall()
  })
  // In E2E tests, pre-seed the session from env var so refreshSession() doesn't
  // clear it and so Supabase queries (loadEntries, saveEntry) have a valid session.
  const e2eSession = process.env.E2E_TEST_SESSION
    ? JSON.parse(process.env.E2E_TEST_SESSION) as { access_token: string; refresh_token: string }
    : null
  if (e2eSession) {
    store.set('session', e2eSession)
  } else {
    refreshSession()
  }
  startSessionRefreshInterval()
  startJiraRefreshInterval()
  startGCalRefreshInterval()
  powerMonitor.on('resume', () => { ensureSession().catch(() => {}); ensureJiraToken().catch(() => {}); ensureGCalToken().catch(() => {}) })
  authEmitter.on('auth-success', (session) => {
    console.log('[AUTH] auth-success received in index.ts, win exists:', !!mb.window)
    mb.window?.webContents.send('auth-success', session)
    console.log('[AUTH] sent to renderer')
  })
  authEmitter.on('auth-expired', () => {
    mb.window?.webContents.send('auth-expired')
  })
  gcalAuthEmitter.on('gcal-auth-success', () => {
    mb.window?.webContents.send('gcal-auth-success')
  })
  gcalAuthEmitter.on('gcal-auth-expired', () => {
    mb.window?.webContents.send('gcal-auth-expired')
  })
  jiraAuthEmitter.on('jira-auth-success', () => {
    mb.window?.webContents.send('jira-auth-success')
  })
  jiraAuthEmitter.on('jira-auth-expired', () => {
    mb.window?.webContents.send('jira-auth-expired')
  })
  mb.on('show', async () => {
    await ensureSession().catch(() => {})
    ensureJiraToken().catch(() => {})
    await ensureGCalToken().catch(() => {})
    const settings = store.get('settings')
    console.log('[GCAL] show fired, lastSync:', settings?.gcalLastSyncDate, 'today:', new Date().toISOString().slice(0, 10))
    mb.window?.webContents.send('window-show')
    const created = await syncGoogleCalendar()
    if (created) mb.window?.webContents.send('reload-entries')
  })
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mb.window?.webContents.toggleDevTools()
  })

  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mb.window?.isVisible()) {
      mb.hideWindow()
    } else {
      mb.showWindow()
    }
  })

  let standupReminderShownDate: string | null = null

  const runMidnightTasks = async () => {
    clearDismissed()
    standupReminderShownDate = null
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Tomorrow's calendar meetings: split into "untouched" (safe to drop and re-fetch)
      // and "worked" (tracked/linked — must be preserved and re-tagged to today).
      const tomorrowMeetings = currentEntries.filter(e => e.tab === 'tomorrow' && !!e.gcalEventId)
      const untouched = tomorrowMeetings.filter(e => (e.ms ?? 0) === 0 && !e.jiraSent && !e.jiraKey)
      const worked = tomorrowMeetings.filter(e => !((e.ms ?? 0) === 0 && !e.jiraSent && !e.jiraKey))

      try {
        // Delete untouched tomorrow meetings from Supabase — the fresh sync will
        // re-import them ONLY if they still exist in the calendar (handles cancellations/reschedules)
        if (untouched.length > 0) {
          const untouchedIds = untouched.map(e => e.id)
          await supabase.from('time_entries').delete().in('id', untouchedIds)
          for (const e of untouched) {
            const idx = currentEntries.findIndex(x => x.id === e.id)
            if (idx > -1) currentEntries.splice(idx, 1)
          }
        }
        // Re-tag worked meetings (tracked/linked) to today so their work isn't lost
        if (worked.length > 0) {
          const workedIds = worked.map(e => e.id)
          await supabase.from('time_entries').update({ tab: 'today' }).in('id', workedIds)
          for (const e of worked) {
            const idx = currentEntries.findIndex(x => x.id === e.id)
            if (idx > -1) currentEntries[idx] = { ...currentEntries[idx], tab: 'today' }
          }
        }
      } catch (err) {
        console.error('[midnight] meeting reconcile error:', err)
      }

      // Also re-tag any NON-meeting tomorrow entries (manual tasks the user pre-planned) to today
      try {
        await supabase
          .from('time_entries')
          .update({ tab: 'today' })
          .eq('user_id', session.user.id)
          .eq('tab', 'tomorrow')
          .is('gcal_event_id', null)
      } catch (err) {
        console.error('[midnight] non-meeting re-tag error:', err)
      }

      // Schedule notifications for worked meetings now in today
      if (worked.length > 0) {
        scheduleMeetingNotifications(worked.map(e => ({ ...e, tab: 'today' as const })))
      }

      // Clear gcal sync dates so the new day's sync runs fresh and re-imports valid meetings
      const settings = store.get('settings')
      if (settings) {
        store.set('settings', { ...settings, gcalLastSyncDate: undefined, gcalTomorrowSyncDate: undefined })
      }

      await syncGoogleCalendar()
    }
  }

  const now = new Date()
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)
  const msUntilMidnight = nextMidnight.getTime() - now.getTime()

  setTimeout(() => {
    runMidnightTasks()
    setInterval(runMidnightTasks, 24 * 60 * 60 * 1000)
  }, msUntilMidnight)

  const checkStandupReminder = () => {
    const now = new Date()
    const day = now.getDay()
    if (day === 0 || day === 6) return
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const settings = store.get('settings')
    if (settings?.lastStandupDate === today) return
    if (standupReminderShownDate === today) return
    const h = now.getHours(); const m = now.getMinutes()
    if (h > 10 || (h === 10 && m >= 30)) {
      standupReminderShownDate = today
      showStandupNotification()
    }
  }
  setInterval(checkStandupReminder, 60_000)
})

mb.on('after-create-window', () => {
  if (!ipcRegistered) {
    registerIpcHandlers(() => mb.window)
    if (mb.window) setupNotificationIpc(mb.window)
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
