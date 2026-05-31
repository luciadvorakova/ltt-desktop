import { useState, useEffect, useCallback } from 'react'
import type { UserSettings } from '../../../types/index'
import { useLtt } from './useLtt'

interface UseSettingsResult {
  settings: UserSettings | null
  loading: boolean
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>
  pushSettings: (userId: string) => Promise<void>
}

export function useSettings(): UseSettingsResult {
  const ltt = useLtt()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const local = await ltt.getSettings()
      setSettings(local)
      setLoading(false)

      const session = await ltt.getSession()
      if (!session) return
      let userId: string | null = null
      try { userId = JSON.parse(atob(session.access_token.split('.')[1])).sub as string } catch { /* ignore */ }

      if (!userId) return

      const remote = await ltt.pullSettings(userId)
      if (!remote) return
      const merged = { ...(local ?? {}), ...remote } as import('../../../types/index').UserSettings
      setSettings(merged)
      await ltt.setSettings(merged)
    }
    load()
  }, [ltt])

  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      const next = { ...(settings ?? {}), [key]: value } as UserSettings
      setSettings(next)
      await ltt.setSettings(next)
    },
    [ltt, settings],
  )

  const pushSettings = useCallback(
    async (userId: string) => {
      await ltt.pushSettings(userId)
    },
    [ltt],
  )

  return { settings, loading, updateSetting, pushSettings }
}
