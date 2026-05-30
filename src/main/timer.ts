import { store } from './store'
import { supabase, ensureSession } from './supabase'
import type { TimeEntry, TimerState } from '../types/index'

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
  console.log('[TIMER] loadEntries called, userId:', userId)
  await ensureSession()
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('ts', { ascending: false })
  console.log('[TIMER] query result:', data, 'error:', error)
  if (error) {
    console.error('[timer] loadEntries error:', error)
    return []
  }
  currentEntries = (data ?? []).map(rowToEntry)
  return currentEntries
}

export async function saveEntry(entry: TimeEntry): Promise<void> {
  if (!store.get('session')) return
  await ensureSession()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) return

  const row = entryToRow(entry, userId)
  const { error } = await supabase
    .from('time_entries')
    .upsert(row, { onConflict: 'id' })
  console.log('[SAVE] entry id:', entry.id, 'ms:', entry.ms, 'updatedAt:', entry.updatedAt)
  console.log('[SAVE] error:', error)
  if (error) {
    console.error('[timer] saveEntry error:', error)
    return
  }
  const idx = currentEntries.findIndex((e) => e.id === entry.id)
  if (idx > -1) currentEntries[idx] = entry
  else currentEntries.push(entry)
}

// ---- Timer ----

export async function startTimer(entryId: number): Promise<void> {
  const existing = store.get('timerState')
  console.log('[START] entryId:', entryId, 'existing state:', existing)

  // Resuming the same paused entry — use stored baseMs
  if (existing?.paused && existing.activeEntryId === entryId) {
    store.set('timerState', {
      activeEntryId: entryId,
      startedAt: Date.now(),
      baseMs: existing.baseMs,
      running: true,
      paused: false,
    })
  } else {
    // Starting a fresh entry (or after stopTimer cleared existing state)
    const entry = currentEntries.find((e) => e.id === entryId)
    const baseMs = entry?.ms ?? 0
    store.set('timerState', {
      activeEntryId: entryId,
      startedAt: Date.now(),
      baseMs,
      running: true,
      paused: false,
    })
  }

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

export async function stopTimer(): Promise<{ id: number; ms: number } | null> {
  console.log('[STOP] called, timerState:', store.get('timerState'))
  const state = store.get('timerState') as TimerState | null
  if (state?.running) {
    await flushActiveTime()
  } else if (state?.paused && state.activeEntryId !== null) {
    const idx = currentEntries.findIndex((e) => e.id === state.activeEntryId)
    if (idx !== -1) {
      const updated: TimeEntry = { ...currentEntries[idx], ms: state.baseMs, updatedAt: new Date().toISOString() }
      console.log('[STOP] saving paused entry id:', state.activeEntryId, 'ms:', state.baseMs)
      await saveEntry(updated)
      currentEntries[idx] = updated
    }
  }
  store.set('timerState', null)
  if (flushInterval) {
    clearInterval(flushInterval)
    flushInterval = null
  }
  if (!state?.activeEntryId) return null
  const entry = currentEntries.find((e) => e.id === state.activeEntryId)
  return entry ? { id: entry.id, ms: entry.ms } : null
}

export async function flushActiveTime(): Promise<void> {
  const state = store.get('timerState') as TimerState | null
  if (!state?.running || state.startedAt === null || state.activeEntryId === null) return

  const now = Date.now()
  const elapsed = now - state.startedAt
  const idx = currentEntries.findIndex((e) => e.id === state.activeEntryId)
  if (idx === -1) return

  console.log('[FLUSH] entry id:', state.activeEntryId, 'elapsed:', elapsed, 'old ms:', currentEntries[idx].ms, 'new ms:', currentEntries[idx].ms + elapsed)

  const updated: TimeEntry = {
    ...currentEntries[idx],
    ms: currentEntries[idx].ms + elapsed,
    updatedAt: new Date(now).toISOString(),
  }
  await saveEntry(updated)
  currentEntries[idx] = updated

  // Reset startedAt so next flush measures from now
  store.set('timerState', { ...state, startedAt: now })
}

export function getTimerState(): TimerState | null {
  return store.get('timerState') ?? null
}
