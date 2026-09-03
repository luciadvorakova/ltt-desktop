import { ipcMain, BrowserWindow, shell } from 'electron'
import { store } from './store'
import { supabase } from './supabase'
import { ensureSession } from './auth'
import { signInWithGoogle, getSession } from './auth'
import { signInWithJira, signOutJira, getJiraStatus, searchJiraIssues, getJiraProjects, logTimeToJira, getJiraIssueClientName } from './jira-auth'
import { signInWithGCal } from './gcal-auth'
import { syncGoogleCalendar } from './gcal'
import { scheduleMeetingNotifications, cancelMeetingNotifications } from './meeting-notifications'
import { closeStandupNotification } from './notification-window'
import {
  loadEntries,
  saveEntry,
  startTimer,
  pauseTimer,
  stopTimer,
  getTimerState,
  flushActiveTime,
  setTimerBase,
  currentEntries,
} from './timer'
import type { TimeEntry, UserSettings } from '../types/index'

export function registerIpcHandlers(getWindow?: () => BrowserWindow | undefined): void {
  // ---- E2E TEST HELPERS ----

  ipcMain.handle('e2e:createJiraEntry', async (_event, payload: { jiraKey: string; jiraSummary: string; jiraDesc: string; ms?: number }) => {
    if (!process.env.E2E_TEST_SESSION) return { success: false, error: 'not in test mode' }
    const entry: TimeEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: payload.jiraSummary,
      ms: payload.ms ?? 0,
      ts: Date.now(),
      jiraKey: payload.jiraKey,
      jiraSummary: payload.jiraSummary,
      jiraDesc: payload.jiraDesc,
      jiraSent: false,
      untracked: false,
      carriedOver: false,
      removedFromTimer: false,
      deletedFromBulk: false,
      updatedAt: new Date().toISOString(),
      tab: 'today',
    }
    await saveEntry(entry)
    return { success: true, id: entry.id }
  })
  // ---- AUTH ----

  ipcMain.handle('auth:signIn', () => {
    console.log('[IPC] auth:signIn called')
    return signInWithGoogle()
  })

  ipcMain.handle('auth:getSession', () => getSession())

  ipcMain.handle('auth:signOut', async () => {
    await supabase.auth.signOut()
    store.set('session', null)
  })

  // ---- ENTRIES ----

  ipcMain.handle('entries:load', async (_event, userId: string) => {
    const entries = await loadEntries(userId)
    scheduleMeetingNotifications(entries.filter(e => !!e.gcalEventId))
    return entries
  })

  ipcMain.handle('entries:save', async (_event, entry: TimeEntry) => {
    console.log('[IPC] entries:save called, id:', entry.id, 'ms:', entry.ms)
    await saveEntry(entry)
    console.log('[IPC] entries:save done')
    if (entry.removedFromTimer && entry.gcalEventId) {
      cancelMeetingNotifications(entry.gcalEventId)
    }
  })

  ipcMain.handle('entries:delete', async (_event, id: number) => {
    if (!store.get('session')) return
    await ensureSession()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) { console.error('[ipc] entries:delete error:', error); return }
    const idx = currentEntries.findIndex((e) => e.id === id)
    if (idx > -1) {
      const deleted = currentEntries[idx]
      const todayStr = new Date().toISOString().slice(0, 10)
      const namesToRecord = [deleted.name, deleted.jiraDesc].filter(Boolean) as string[]
      const existing: { name: string; date: string }[] = store.get('deletedEntryNames') ?? []
      const next = [...existing, ...namesToRecord.map(name => ({ name, date: todayStr }))]
      store.set('deletedEntryNames', next)
      currentEntries.splice(idx, 1)
    }
  })

  // ---- TIMER ----

  ipcMain.handle('timer:start', (_event, entryId: number) => {
    console.log('[IPC] timer:start called, entryId:', entryId)
    return startTimer(entryId)
  })

  ipcMain.handle('timer:pause', () => {
    console.log('[IPC] timer:pause called')
    return pauseTimer()
  })

  ipcMain.handle('timer:stop', () => stopTimer())

  ipcMain.handle('timer:getState', () => getTimerState())

  ipcMain.handle('timer:flush', () => flushActiveTime())

  ipcMain.handle('timer:setBase', (_event, entryId: number, ms: number) => setTimerBase(entryId, ms))

  // ---- SETTINGS ----

  ipcMain.handle('settings:get', () => store.get('settings') ?? null)

  ipcMain.handle('settings:set', (_event, incoming: UserSettings) => {
    const current = store.get('settings') as UserSettings | undefined
    if (!current) { store.set('settings', incoming); return }

    const parseExp = (v: string | undefined) => v ? (isNaN(Number(v)) ? new Date(v).getTime() : Number(v)) : 0

    const merged = { ...incoming }

    // Never let an incoming write regress Jira tokens to an older expiry than what's already stored
    if (parseExp(current.jiraTokenExpiry) > parseExp(incoming.jiraTokenExpiry)) {
      merged.jiraAccessToken = current.jiraAccessToken
      merged.jiraRefreshToken = current.jiraRefreshToken
      merged.jiraTokenExpiry = current.jiraTokenExpiry
    }

    // Same protection for Google Calendar tokens
    if (parseExp(current.gcalTokenExpiry) > parseExp(incoming.gcalTokenExpiry)) {
      merged.gcalAccessToken = current.gcalAccessToken
      merged.gcalRefreshToken = current.gcalRefreshToken
      merged.gcalTokenExpiry = current.gcalTokenExpiry
    }

    store.set('settings', merged)
  })

  ipcMain.handle('settings:push', async (_event, userId: string) => {
    const settings = store.get('settings')
    if (!settings) return
    await ensureSession()
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: settings,
        client_colors: settings.clientColors ? JSON.stringify(settings.clientColors) : null,
        theme: settings.theme ?? 'dark',
      }, { onConflict: 'user_id' })
    if (error) console.error('[ipc] settings:push error:', error)
  })

  ipcMain.handle('settings:pull', async (_event, userId: string) => {
    await ensureSession()
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) { console.error('[ipc] settings:pull error:', error); return null }
    const row = ((data as Record<string, unknown>).settings ?? {}) as Record<string, unknown>
    const mapped: UserSettings = {
      lttTitle:          row.ltt_title           as string | undefined,
      jiraAccessToken:   (row.jira_access_token ?? row.jiraAccessToken)   as string | undefined,
      jiraRefreshToken:  (row.jira_refresh_token ?? row.jiraRefreshToken)  as string | undefined,
      jiraTokenExpiry:   (row.jira_token_expiry ?? row.jiraTokenExpiry)   as string | undefined,
      jiraCloudId:       (row.jira_cloud_id ?? row.jiraCloudId)       as string | undefined,
      jiraSiteName:      (row.jira_site_name ?? row.jiraSiteName)      as string | undefined,
      jiraUserName:      (row.jira_user_name ?? row.jiraUserName)      as string | undefined,
      jiraUserEmail:     (row.jira_user_email ?? row.jiraUserEmail)     as string | undefined,
      jiraAccountId:     (row.jira_account_id ?? row.jiraAccountId)     as string | undefined,
      gcalEmail:         (row.gcal_email ?? row.gcalEmail)          as string | undefined,
      gcalAccessToken:   (row.gcal_access_token ?? row.gcalAccessToken)   as string | undefined,
      gcalRefreshToken:  (row.gcal_refresh_token ?? row.gcalRefreshToken)  as string | undefined,
      gcalTokenExpiry:   (row.gcal_token_expiry ?? row.gcalTokenExpiry)   as string | undefined,
      gcalLastSyncDate:  (row.gcal_last_sync_date ?? row.gcalLastSyncDate) as string | undefined,
      slackChannel:      (row.slack_channel ?? row.slackChannel)       as string | undefined,
      slackUserId:       (row.slack_user_id ?? row.slackUserId)       as string | undefined,
      manualTimerCleanup: (row.manual_timer_cleanup ?? row.manualTimerCleanup) as boolean | undefined,
      jiraFavourites:    typeof row.jira_favourites === 'string' ? JSON.parse(row.jira_favourites) : row.jira_favourites as string[] | undefined,
      jiraRecent:        typeof row.jira_recent === 'string' ? JSON.parse(row.jira_recent) : row.jira_recent as string[] | undefined,
      clientColors:      typeof row.client_colors === 'string' ? JSON.parse(row.client_colors) : (row.client_colors as Record<string, number> | undefined),
      theme:             (row.theme as 'dark' | 'light' | undefined) ?? 'dark',
    }
    // strip undefined fields so they don't overwrite valid local values on merge
    Object.keys(mapped).forEach(k => { if (mapped[k as keyof UserSettings] === undefined) delete mapped[k as keyof UserSettings] })
    return mapped
  })

  // ---- JIRA ----

  ipcMain.handle('jira:signIn', () => signInWithJira())

  ipcMain.handle('jira:signOut', () => signOutJira())

  ipcMain.handle('jira:getStatus', () => getJiraStatus())

  ipcMain.handle('jira:search', (_event, query: string) => {
    console.log('[IPC] jira:search called, query:', query)
    return searchJiraIssues(query)
  })

  ipcMain.handle('jira:getProjects', () => getJiraProjects())

  ipcMain.handle('jira:getClientName', (_event, issueKey: string) => getJiraIssueClientName(issueKey))

  ipcMain.handle('jira:logTime', (_event, issueKey: string, ms: number, comment?: string, started?: string) => {
    console.log('[IPC] jira:logTime called, issueKey:', issueKey)
    return logTimeToJira(issueKey, ms, comment, started)
  })

  // ---- SLACK ----

  ipcMain.handle('slack:sendStandup', async (_event, payload: {
    channel: string; userId: string;
    accomplished: string; workingOn: string; problems: string; share: string;
  }) => {
    const accomplished = payload.accomplished.trim() || '—'
    const workingOn = payload.workingOn.trim() || '—'
    const problems = payload.problems.trim() || '—'
    const share = payload.share.trim() || '—'
    const body = `🚀 *I accomplished:*\n${accomplished}\n\n➡️ *I will work on:*\n${workingOn}\n\n🚨 *Possible problems:*\n${problems}\n\n🙋 *I would like to share:*\n${share}`
    const text = `💥 submission from <@${payload.userId}>\n\n${body}`
    try {
      const res = await fetch('https://ltt-proxy.onrender.com/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-ltt-secret': process.env.LTT_PROXY_SECRET ?? 'ltt-proxy-secret' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) { const body = await res.text(); return { success: false, error: `HTTP ${res.status}: ${body}` } }
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ---- GCAL ----

  ipcMain.handle('gcal:signIn', () => signInWithGCal())

  ipcMain.handle('gcal:sync', async () => {
    try {
      const result = await syncGoogleCalendar()
      if (result) getWindow?.()?.webContents.send('reload-entries')
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ---- APP ----

  ipcMain.handle('app:getDeletedIds', () => store.get('deletedIds') ?? [])

  ipcMain.handle('app:addDeletedId', (_event, id: number) => {
    const ids = store.get('deletedIds') ?? []
    if (!ids.includes(id)) store.set('deletedIds', [...ids, id])
  })

  ipcMain.handle('app:clearDeletedEntryNames', () => {
    store.set('deletedEntryNames', [])
  })

  // ---- STANDUP ----

  ipcMain.on('standup:sent', () => {
    closeStandupNotification()
  })

  // ---- SHELL ----

  ipcMain.handle('open-external', (_event, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url)
    }
  })

}
