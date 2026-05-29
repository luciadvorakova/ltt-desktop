import { store } from './store'
import { supabase } from './supabase'
import type { TimeEntry, TimerState } from '../../renderer/src/types/index'

let flushInterval: ReturnType<typeof setInterval> | null = null
export let currentEntries: TimeEntry[] = []

// ---- DB mapping ----

function rowToEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id:               Number(row.id),
    name:             String(row.name ?? ''),
    ms:               Number(row.ms ?? 0),
    ts:               Number(row.ts ?? 0),
    updatedAt:        String(row.updated_at ?? ''),
    jiraKey:          (row.jira_key as string) ?? undefined,
    jiraSummary:      (row.jira_summary as string) ?? undefined,
    jiraDesc:         (row.jira_desc as string) ?? undefined,
    jiraSent:         Boolean(row.jira_sent),
    untracked:        Boolean(row.untracked),
    clientName:       (row.client_name as string) ?? undefined,
    sortOrder:        row.sort_order != null ? Number(row.sort_order) : undefined,
    carriedOver:      Boolean(row.carried_over),
    removedFromTimer: Boolean(row.removed_from_timer),
    deletedFromBulk:  Boolean(row.deleted_from_bulk),
  }
}

function entryToRow(entry: TimeEntry, userId: string): Record<string, unknown> {
  return {
    id:                Number(entry.id),
    user_id:           userId,
    name:              entry.name,
    ms:                Number(entry.ms) || 0,
    ts:                Number(entry.ts),
    updated_at:        entry.updatedAt || new Date().toISOString(),
    jira_key:          entry.jiraKey ?? null,
    jira_summary:      entry.jiraSummary ?? null,
    jira_desc:         entry.jiraDesc ?? '',
    jira_sent:         entry.jiraSent,
    untracked:         entry.untracked,
    client_name:       entry.clientName ?? null,
    sort_order:        entry.sortOrder ?? null,
    carried_over:      entry.carriedOver,
    removed_from_timer: entry.removedFromTimer,
    deleted_from_bulk: entry.deletedFromBulk,
  }
}

// ---- Entries ----

export async function loadEntries(userId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('ts', { ascending: false })
  if (error) {
    console.error('[timer] loadEntries error:', error)
    return []
  }
  currentEntries = (data ?? []).map(rowToEntry)
  return currentEntries
}

export async function saveEntry(entry: TimeEntry): Promise<void> {
  const session = store.get('session')
  if (!session) return
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) return

  const row = entryToRow(entry, userId)
  const { error } = await supabase
    .from('time_entries')
    .upsert(row, { onConflict: 'id' })
  if (error) {
    console.error('[timer] saveEntry error:', error)
    return
  }
  const idx = currentEntries.findIndex((e) => e.id === entry.id)
  if (idx > -1) currentEntries[idx] = entry
  else currentEntries.push(entry)
}

// ---- Timer ----

export function startTimer(entryId: number): void {
  const entry = currentEntries.find((e) => e.id === entryId)
  const baseMs = entry?.ms ?? 0
  store.set('timerState', {
    activeEntryId: entryId,
    startedAt: Date.now(),
    baseMs,
    running: true,
    paused: false,
  })
  if (!flushInterval) {
    flushInterval = setInterval(() => { flushActiveTime() }, 60_000)
  }
}

export function pauseTimer(): void {
  const state = store.get('timerState')
  if (!state?.running || state.startedAt === null) return
  const elapsed = Date.now() - state.startedAt
  store.set('timerState', {
    ...state,
    baseMs: state.baseMs + elapsed,
    running: false,
    paused: true,
    startedAt: null,
  })
  if (flushInterval) {
    clearInterval(flushInterval)
    flushInterval = null
  }
}

export async function stopTimer(): Promise<void> {
  await flushActiveTime()
  store.set('timerState', null)
  if (flushInterval) {
    clearInterval(flushInterval)
    flushInterval = null
  }
}

export async function flushActiveTime(): Promise<void> {
  const state = store.get('timerState') as TimerState | null
  if (!state?.running || state.startedAt === null || state.activeEntryId === null) return

  const now = Date.now()
  const elapsed = now - state.startedAt
  const idx = currentEntries.findIndex((e) => e.id === state.activeEntryId)
  if (idx === -1) return

  const updated: TimeEntry = {
    ...currentEntries[idx],
    ms: currentEntries[idx].ms + elapsed,
    updatedAt: new Date(now).toISOString(),
  }
  await saveEntry(updated)

  // Reset startedAt so next flush measures from now
  store.set('timerState', { ...state, startedAt: now })
}

export function getTimerState(): TimerState | null {
  return store.get('timerState') ?? null
}
