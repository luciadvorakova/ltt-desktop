import { ipcMain } from 'electron'
import { store } from './store'
import { supabase } from './supabase'
import { signInWithGoogle, getSession } from './auth'
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

  ipcMain.handle('auth:signIn', () => signInWithGoogle())

  ipcMain.handle('auth:getSession', () => getSession())

  ipcMain.handle('auth:signOut', async () => {
    await supabase.auth.signOut()
    store.set('session', null)
  })

  // ---- ENTRIES ----

  ipcMain.handle('entries:load', (_event, userId: string) => loadEntries(userId))

  ipcMain.handle('entries:save', (_event, entry: TimeEntry) => saveEntry(entry))

  ipcMain.handle('entries:delete', async (_event, id: number) => {
    const session = store.get('session')
    if (!session) return
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

  ipcMain.handle('timer:start', (_event, entryId: number) => startTimer(entryId))

  ipcMain.handle('timer:pause', () => pauseTimer())

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
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' })
    if (error) console.error('[ipc] settings:push error:', error)
  })

  // ---- APP ----

  ipcMain.handle('app:getDeletedIds', () => store.get('deletedIds') ?? [])

  ipcMain.handle('app:addDeletedId', (_event, id: number) => {
    const ids = store.get('deletedIds') ?? []
    if (!ids.includes(id)) store.set('deletedIds', [...ids, id])
  })
}
