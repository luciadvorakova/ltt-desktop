import { useState, useEffect, useCallback } from 'react'
import type { TimeEntry } from '../../../types/index'
import { useLtt } from './useLtt'

interface UseEntriesResult {
  entries:     TimeEntry[]
  addEntry:    (entry: TimeEntry) => Promise<void>
  updateEntry: (entry: TimeEntry) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
  reload:      () => Promise<void>
  patchEntry:  (id: number, ms: number) => void
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
    setEntries(loaded.filter(e => !deletedIds.includes(e.id)))
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
    await ltt.saveEntry(entry)
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      return idx > -1
        ? prev.map((e) => (e.id === entry.id ? entry : e))
        : [...prev, entry]
    })
  }, [ltt])

  const updateEntry = useCallback(async (entry: TimeEntry) => {
    console.log('[UPDATE_ENTRY] called, id:', entry.id, 'ms:', entry.ms)
    console.log('[UPDATE_ENTRY] about to call ltt.saveEntry, entry keys:', Object.keys(entry))
    try {
      const result = await window.ltt.saveEntry(entry)
      console.log('[UPDATE_ENTRY] direct saveEntry result:', result)
    } catch (e) {
      console.error('[UPDATE_ENTRY] ltt.saveEntry error:', e)
    }
    setEntries(prev => {
      const next = prev.map(e => Number(e.id) === Number(entry.id) ? { ...entry } : e)
      return [...next]
    })
  }, [ltt])

  const deleteEntry = useCallback(async (id: number) => {
    await ltt.deleteEntry(id)
    await ltt.addDeletedId(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [ltt])

  const patchEntry = useCallback((id: number, ms: number) => {
    setEntries((prev) => prev.map((e) => Number(e.id) === Number(id) ? { ...e, ms } : e))
  }, [])

  return { entries, addEntry, updateEntry, deleteEntry, reload, patchEntry }
}
