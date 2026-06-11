import { useEffect } from 'react'
import { useSettings } from './useSettings'

export function useTheme() {
  const { settings, updateSetting } = useSettings()
  const theme = settings?.theme ?? 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = (t: 'dark' | 'light') => updateSetting('theme', t)

  return { theme, setTheme }
}
