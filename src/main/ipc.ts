import { ipcMain } from 'electron'
import { store } from './store'
import { supabase } from './supabase'
import { ensureSession } from './auth'
import { signInWithGoogle, getSession } from './auth'
import { signInWithJira, signOutJira, getJiraStatus, searchJiraIssues, getJiraProjects, logTimeToJira } from './jira-auth'
import { signInWithGCal } from './gcal-auth'
import { syncGoogleCalendar } from './gcal'
import {
  loadEntries,
  saveEntry,
  startTimer,
  pauseTimer,
  stopTimer,
  getTimerState,
  flushActiveTime,
  currentEntries,
} from './timer'
import type { TimeEntry, UserSettings } from '../types/index'

export function registerIpcHandlers(): void {
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

  ipcMain.handle('entries:load', (_event, userId: string) => loadEntries(userId))

  ipcMain.handle('entries:save', async (_event, entry: TimeEntry) => {
    console.log('[IPC] entries:save called, id:', entry.id, 'ms:', entry.ms)
    await saveEntry(entry)
    console.log('[IPC] entries:save done')
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
    if (idx > -1) currentEntries.splice(idx, 1)
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

  // ---- SETTINGS ----

  ipcMain.handle('settings:get', () => store.get('settings') ?? null)

  ipcMain.handle('settings:set', (_event, settings: UserSettings) => {
    store.set('settings', settings)
  })

  ipcMain.handle('settings:push', async (_event, userId: string) => {
    const settings = store.get('settings')
    if (!settings) return
    await ensureSession()
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' })
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
      jiraAccessToken:   row.jira_access_token   as string | undefined,
      jiraRefreshToken:  row.jira_refresh_token  as string | undefined,
      jiraTokenExpiry:   row.jira_token_expiry   as string | undefined,
      jiraCloudId:       row.jira_cloud_id       as string | undefined,
      jiraSiteName:      row.jira_site_name      as string | undefined,
      jiraUserName:      row.jira_user_name      as string | undefined,
      jiraUserEmail:     row.jira_user_email     as string | undefined,
      jiraAccountId:     row.jira_account_id     as string | undefined,
      gcalEmail:         row.gcal_email          as string | undefined,
      gcalAccessToken:   row.gcal_access_token   as string | undefined,
      gcalRefreshToken:  row.gcal_refresh_token  as string | undefined,
      gcalTokenExpiry:   row.gcal_token_expiry   as string | undefined,
      gcalLastSyncDate:  row.gcal_last_sync_date as string | undefined,
      slackChannel:      row.slack_channel       as string | undefined,
      slackUserId:       row.slack_user_id       as string | undefined,
      manualTimerCleanup: row.manual_timer_cleanup as boolean | undefined,
      jiraFavourites:    typeof row.jira_favourites === 'string' ? JSON.parse(row.jira_favourites) : row.jira_favourites as string[] | undefined,
      jiraRecent:        typeof row.jira_recent === 'string' ? JSON.parse(row.jira_recent) : row.jira_recent as string[] | undefined,
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

  ipcMain.handle('jira:logTime', (_event, issueKey: string, ms: number, comment?: string) =>
    logTimeToJira(issueKey, ms, comment)
  )

  // ---- SLACK ----

  ipcMain.handle('slack:sendStandup', async (_event, payload: {
    channel: string; userId: string;
    accomplished: string; workingOn: string; problems: string; share: string;
  }) => {
    const sections: string[] = []
    if (payload.accomplished.trim()) sections.push(`🚀 *I accomplished:*\n${payload.accomplished.trim()}`)
    if (payload.workingOn.trim())   sections.push(`➡️ *I will work on:*\n${payload.workingOn.trim()}`)
    if (payload.problems.trim())    sections.push(`🚨 *Possible problems:*\n${payload.problems.trim()}`)
    if (payload.share.trim())       sections.push(`🙋 *I would like to share:*\n${payload.share.trim()}`)
    const text = sections.join('\n\n')
    try {
      const res = await fetch('https://ltt-proxy.onrender.com/slack/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, text }),
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
      await syncGoogleCalendar()
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
}
