import { useState, useEffect, useCallback } from 'react'
import type { TimeEntry } from '../../../types/index'
import { useLtt } from './useLtt'

interface UseEntriesResult {
  entries:     TimeEntry[]
  addEntry:    (entry: TimeEntry) => Promise<void>
  updateEntry: (entry: TimeEntry) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
  reload:      () => Promise<void>
  patchEntry:  (id: number, ms?: number, clientName?: string) => void
}

export function useEntries(): UseEntriesResult {
  const ltt = useLtt()
  const [entries, setEntries] = useState<TimeEntry[]>([])

  const reload = useCallback(async () => {
    const session = await ltt.getSession()
    const payload = session ? JSON.parse(atob(session.access_token.split('.')[1])) : null
    const userId: string | null = payload?.sub ?? null
    console.log('[useEntries] session:', session ? 'present' : 'null', 'userId:', userId)
    if (!session || !userId) return
    const loaded = await ltt.loadEntries(userId)
    const deletedIds = await ltt.getDeletedIds()
    console.log('[useEntries] loaded:', loaded.length, 'deletedIds:', deletedIds.length)
    const filtered = loaded.filter(e => !deletedIds.includes(e.id))
    console.log('[RELOAD] about to overwrite entries, count:', filtered.length)
    setEntries(prev => {
      const remoteById = new Map(filtered.map(e => [e.id, e]))
      // Merge remote entries with local state
      const merged = filtered.map(remote => {
        const local = prev.find(e => e.id === remote.id)
        const keepLocal = !!(local && local.updatedAt && remote.updatedAt && local.updatedAt > remote.updatedAt)
        console.log('[RELOAD] merging, local jiraDesc:', local?.jiraDesc, 'remote jiraDesc:', remote.jiraDesc, 'keeping local:', keepLocal)
        return keepLocal ? local! : remote
      })
      // Preserve local-only entries not yet confirmed in remote (optimistic adds)
      const localOnly = prev.filter(e => !remoteById.has(e.id) && !deletedIds.includes(e.id))
      return [...localOnly, ...merged]
    })
  }, [ltt])

  // Load on mount
  useEffect(() => {
    reload()
  }, [reload])

  // Reload when main process signals new gcal entries were created
  useEffect(() => {
    ltt.on('reload-entries', reload)
    return () => ltt.off('reload-entries', reload)
  }, [ltt, reload])

  const addEntry = useCallback(async (entry: TimeEntry) => {
    setEntries((prev) => {
      const unsentOrders = prev
        .filter(e => !e.jiraSent && e.sortOrder !== undefined)
        .map(e => e.sortOrder as number)
      const lowestOrder = unsentOrders.length > 0 ? Math.min(...unsentOrders) : 1000
      const withOrder: TimeEntry = { ...entry, sortOrder: lowestOrder - 1000 }
      ltt.saveEntry(withOrder)
      const idx = prev.findIndex((e) => e.id === withOrder.id)
      return idx > -1
        ? prev.map((e) => (e.id === withOrder.id ? withOrder : e))
        : [withOrder, ...prev]
    })
  }, [ltt])

  const updateEntry = useCallback(async (entry: TimeEntry) => {
    console.log('[UPDATE_ENTRY] called, id:', entry.id, 'ms:', entry.ms)
    console.log('[UPDATE] setting jiraDesc:', entry.jiraDesc, 'for id:', entry.id)
    try {
      const result = await window.ltt.saveEntry(entry)
      console.log('[UPDATE_ENTRY] direct saveEntry result:', result)
    } catch (e) {
      console.error('[UPDATE_ENTRY] ltt.saveEntry error:', e)
    }
    setEntries(prev => {
      const next = prev.map(e => Number(e.id) === Number(entry.id) ? { ...entry } : e)
      console.log('[UPDATE] after setEntries, jiraDesc for', entry.id, ':', next.find(e => e.id === entry.id)?.jiraDesc)
      return [...next]
    })
  }, [ltt])

  const deleteEntry = useCallback(async (id: number) => {
    await ltt.deleteEntry(id)
    await ltt.addDeletedId(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [ltt])

  const patchEntry = useCallback((id: number, ms?: number, clientName?: string) => {
    console.log('[PATCH] id:', id, 'ms:', ms)
    console.log('[PATCH] setEntries called')
    setEntries((prev) => {
      console.log('[PATCH] before:', prev.find(e => e.id === id)?.ms, 'after will be:', ms)
      return prev.map((e) => {
        if (Number(e.id) !== Number(id)) return e
        return {
          ...e,
          ...(ms !== undefined ? { ms, updatedAt: new Date().toISOString() } : {}),
          ...(clientName !== undefined ? { clientName } : {}),
        }
      })
    })
  }, [])

  return { entries, addEntry, updateEntry, deleteEntry, reload, patchEntry }
}
