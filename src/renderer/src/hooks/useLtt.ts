import type { TimeEntry, UserSettings, TimerState } from '../../../types/index'

interface LttAPI {
  // AUTH
  signIn:      () => Promise<void>
  getSession:  () => Promise<{ access_token: string; refresh_token: string } | null>
  signOut:     () => Promise<void>

  // ENTRIES
  loadEntries: (userId: string) => Promise<TimeEntry[]>
  saveEntry:   (entry: TimeEntry) => Promise<void>
  deleteEntry: (id: number) => Promise<void>

  // TIMER
  startTimer:    (entryId: number) => Promise<void>
  pauseTimer:    () => Promise<void>
  stopTimer:     () => Promise<{ id: number; ms: number } | null>
  getTimerState: () => Promise<TimerState | null>
  flushTimer:    () => Promise<void>

  // SETTINGS
  getSettings:  () => Promise<UserSettings | null>
  setSettings:  (settings: UserSettings) => Promise<void>
  pushSettings: (userId: string) => Promise<void>
  pullSettings: (userId: string) => Promise<UserSettings | null>

  // JIRA
  jiraSignIn:       () => Promise<void>
  jiraSignOut:      () => Promise<void>
  jiraGetStatus:    () => Promise<{ connected: boolean; email?: string; cloudId?: string }>
  jiraSearch:       (query: string) => Promise<{ key: string; summary: string }[]>
  jiraGetProjects:  () => Promise<{ key: string; name: string }[]>
  jiraLogTime:      (issueKey: string, ms: number, comment?: string) => Promise<{ success: boolean; error?: string }>

  // APP
  getDeletedIds: () => Promise<number[]>
  addDeletedId:  (id: number) => Promise<void>

  // EVENTS
  on:  (channel: string, fn: (...args: unknown[]) => void) => void
  off: (channel: string, fn: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ltt: LttAPI
  }
}

export function useLtt(): LttAPI {
  return window.ltt
}
