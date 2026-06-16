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
  setTimerBase:  (entryId: number, ms: number) => ipcRenderer.invoke('timer:setBase', entryId, ms),

  // ---- SETTINGS ----
  getSettings:   ()                       => ipcRenderer.invoke('settings:get'),
  setSettings:   (settings: UserSettings) => ipcRenderer.invoke('settings:set', settings),
  pushSettings:  (userId: string)         => ipcRenderer.invoke('settings:push', userId),
  pullSettings:  (userId: string)         => ipcRenderer.invoke('settings:pull', userId),

  // ---- JIRA ----
  jiraSignIn:       ()                       => ipcRenderer.invoke('jira:signIn'),
  jiraSignOut:      ()                       => ipcRenderer.invoke('jira:signOut'),
  jiraGetStatus:    ()                       => ipcRenderer.invoke('jira:getStatus'),
  jiraSearch:       (query: string)          => ipcRenderer.invoke('jira:search', query),
  jiraGetProjects:  ()                       => ipcRenderer.invoke('jira:getProjects'),
  jiraGetClientName: (issueKey: string)      => ipcRenderer.invoke('jira:getClientName', issueKey),
  jiraLogTime:      (issueKey: string, ms: number, comment?: string) => ipcRenderer.invoke('jira:logTime', issueKey, ms, comment),

  // ---- SLACK ----
  slackSendStandup: (payload: { channel: string; userId: string; accomplished: string; workingOn: string; problems: string; share: string }) =>
    ipcRenderer.invoke('slack:sendStandup', payload),

  // ---- GCAL ----
  gcalSignIn: ()  => ipcRenderer.invoke('gcal:signIn'),
  gcalSync:   ()  => ipcRenderer.invoke('gcal:sync'),

  // ---- APP ----
  expandWindowBy: (pixels: number) => ipcRenderer.invoke('window:expandBy', pixels),
  restoreWindow:  () => ipcRenderer.invoke('window:restore'),
  getDeletedIds:          ()              => ipcRenderer.invoke('app:getDeletedIds'),
  addDeletedId:           (id: number)   => ipcRenderer.invoke('app:addDeletedId', id),
  clearDeletedEntryNames: ()             => ipcRenderer.invoke('app:clearDeletedEntryNames'),

  // ---- NOTIFICATION ----
  notificationClose:         (gcalEventId?: string, type?: string)     => ipcRenderer.send('notification:close', gcalEventId, type),
  notificationStartTracking: (entryId: string, gcalEventId?: string)  => ipcRenderer.send('notification:start-tracking', entryId, gcalEventId),

  // ---- EVENTS (main → renderer) ----
  on:  (channel: string, fn: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => fn(...args)),
  off: (channel: string, fn: (...args: unknown[]) => void) =>
    ipcRenderer.off(channel, fn as never),
})
