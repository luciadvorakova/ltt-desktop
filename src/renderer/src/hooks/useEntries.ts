import { useState, useEffect, useCallback } from 'react'
import type { TimeEntry } from '../types/index'
import { useLtt } from './useLtt'

interface UseEntriesResult {
  entries: TimeEntry[]
  addEntry:    (entry: TimeEntry) => Promise<void>
  updateEntry: (entry: TimeEntry) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
  reload:      () => Promise<void>
}

export function useEntries(): UseEntriesResult {
  const ltt = useLtt()
  const [entries, setEntries] = useState<TimeEntry[]>([])

  const reload = useCallback(async () => {
    const session = await ltt.getSession()
    if (!session) return
    // Decode userId from the JWT access token payload
    const payload = JSON.parse(atob(session.access_token.split('.')[1]))
    const userId: string = payload.sub
    const loaded = await ltt.loadEntries(userId)
    setEntries(loaded)
  }, [ltt])

  // Load on mount
  useEffect(() => {
    reload()
  }, [reload])

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
    await ltt.saveEntry(entry)
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
  }, [ltt])

  const deleteEntry = useCallback(async (id: number) => {
    await ltt.deleteEntry(id)
    await ltt.addDeletedId(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [ltt])

  return { entries, addEntry, updateEntry, deleteEntry, reload }
}
