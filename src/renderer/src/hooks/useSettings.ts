import { useState, useEffect, useCallback, useRef } from 'react'
import type { UserSettings, TimeEntry } from '../../../types/index'
import { useLtt } from './useLtt'
import { assignClientColors } from '../lib/clientColors'

interface UseSettingsResult {
  settings: UserSettings | null
  loading: boolean
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>
  pushSettings: (userId: string) => Promise<void>
}

export function useSettings(entries?: TimeEntry[]): UseSettingsResult {
  const ltt = useLtt()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const settingsRef = useRef<UserSettings | null>(null)
  const userIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const local = await ltt.getSettings()
      settingsRef.current = local
      setSettings(local)
      setLoading(false)

      const session = await ltt.getSession()
      if (!session) return
      let userId: string | null = null
      try { userId = JSON.parse(atob(session.access_token.split('.')[1])).sub as string } catch { /* ignore */ }

      if (!userId) return
      userIdRef.current = userId

      const remote = await ltt.pullSettings(userId)
      console.log('[SETTINGS] pulled:', JSON.stringify(remote?.jiraFavourites))
      if (!remote) return
      const merged = { ...remote, ...(local ?? {}) } as import('../../../types/index').UserSettings
      settingsRef.current = merged
      setSettings(merged)
      await ltt.setSettings(merged)
    }
    load()
  }, [ltt])

  // Assign colors to any clientNames not yet in the map
  useEffect(() => {
    if (!entries?.length || !settingsRef.current || !userIdRef.current) return
    const updated = assignClientColors(entries, settingsRef.current.clientColors ?? {})
    if (!updated) return
    const next = { ...settingsRef.current, clientColors: updated }
    settingsRef.current = next
    setSettings(next)
    const userId = userIdRef.current
    ltt.setSettings(next).then(() => ltt.pushSettings(userId))
  }, [entries, ltt])

  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      const next = { ...(settingsRef.current ?? {}), [key]: value } as UserSettings
      settingsRef.current = next
      setSettings(prev => ({ ...(prev ?? {}), [key]: value } as UserSettings))
      await ltt.setSettings(next)
    },
    [ltt],
  )

  const pushSettings = useCallback(
    async (userId: string) => {
      await ltt.pushSettings(userId)
    },
    [ltt],
  )

  return { settings, loading, updateSetting, pushSettings }
}
