import type { TimeEntry, UserSettings, TimerState } from '../types/index'

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
  stopTimer:     () => Promise<void>
  getTimerState: () => Promise<TimerState | null>
  flushTimer:    () => Promise<void>

  // SETTINGS
  getSettings:  () => Promise<UserSettings | null>
  setSettings:  (settings: UserSettings) => Promise<void>
  pushSettings: (userId: string) => Promise<void>

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
