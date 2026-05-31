import { ipcMain } from 'electron'
import { store } from './store'
import { supabase, ensureSession } from './supabase'
import { signInWithGoogle, getSession } from './auth'
import { signInWithJira, signOutJira, getJiraStatus, searchJiraIssues, getJiraProjects } from './jira-auth'
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

  // ---- JIRA ----

  ipcMain.handle('jira:signIn', () => signInWithJira())

  ipcMain.handle('jira:signOut', () => signOutJira())

  ipcMain.handle('jira:getStatus', () => getJiraStatus())

  ipcMain.handle('jira:search', (_event, query: string) => searchJiraIssues(query))

  ipcMain.handle('jira:getProjects', () => getJiraProjects())

  // ---- APP ----

  ipcMain.handle('app:getDeletedIds', () => store.get('deletedIds') ?? [])

  ipcMain.handle('app:addDeletedId', (_event, id: number) => {
    const ids = store.get('deletedIds') ?? []
    if (!ids.includes(id)) store.set('deletedIds', [...ids, id])
  })
}
