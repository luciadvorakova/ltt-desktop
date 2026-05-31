console.log('PRELOAD RUNNING')
import { contextBridge, ipcRenderer } from 'electron'
import type { TimeEntry, UserSettings } from '../types/index'

contextBridge.exposeInMainWorld('ltt', {
  // ---- AUTH ----
  signIn:     ()                          => ipcRenderer.invoke('auth:signIn'),
  getSession: ()                          => ipcRenderer.invoke('auth:getSession'),
  signOut:    ()                          => ipcRenderer.invoke('auth:signOut'),

  // ---- ENTRIES ----
  loadEntries:   (userId: string)         => ipcRenderer.invoke('entries:load', userId),
  saveEntry:     (entry: TimeEntry)       => ipcRenderer.invoke('entries:save', entry),
  deleteEntry:   (id: number)             => ipcRenderer.invoke('entries:delete', id),

  // ---- TIMER ----
  startTimer:    (entryId: number)        => ipcRenderer.invoke('timer:start', entryId),
  pauseTimer:    ()                       => ipcRenderer.invoke('timer:pause'),
  stopTimer:     ()                       => ipcRenderer.invoke('timer:stop'),
  getTimerState: ()                       => ipcRenderer.invoke('timer:getState'),
  flushTimer:    ()                       => ipcRenderer.invoke('timer:flush'),

  // ---- SETTINGS ----
  getSettings:   ()                       => ipcRenderer.invoke('settings:get'),
  setSettings:   (settings: UserSettings) => ipcRenderer.invoke('settings:set', settings),
  pushSettings:  (userId: string)         => ipcRenderer.invoke('settings:push', userId),

  // ---- APP ----
  getDeletedIds: ()                       => ipcRenderer.invoke('app:getDeletedIds'),
  addDeletedId:  (id: number)             => ipcRenderer.invoke('app:addDeletedId', id),

  // ---- EVENTS (main → renderer) ----
  on:  (channel: string, fn: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => fn(...args)),
  off: (channel: string, fn: (...args: unknown[]) => void) =>
    ipcRenderer.off(channel, fn as never),
})
