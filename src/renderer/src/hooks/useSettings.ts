import { useState, useEffect, useCallback } from 'react'
import type { UserSettings } from '../types/index'
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
    ltt.getSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
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
