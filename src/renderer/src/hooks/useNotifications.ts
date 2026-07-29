import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLtt } from './useLtt'
import { useSettings } from './useSettings'

function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export type Notification = {
  id: 'jira-disconnected' | 'gcal-disconnected' | 'standup-not-sent'
  title: string
  message: string
  actionLabel: string
  onAction: () => void
}

export function useNotifications({
  onJiraConnect,
  onGcalConnect,
  onOpenStandup,
}: {
  onJiraConnect: () => void
  onGcalConnect: () => void
  onOpenStandup: () => void
}) {
  const ltt = useLtt()
  const { settings, updateSetting } = useSettings()
  const [jiraConnected, setJiraConnected] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [standupDue, setStandupDue] = useState(false)

  const todayStr = getLocalDateStr()

  // Stable refs so callbacks never change identity
  const updateSettingRef = useRef(updateSetting)
  useEffect(() => { updateSettingRef.current = updateSetting }, [updateSetting])
  const onJiraConnectRef = useRef(onJiraConnect)
  useEffect(() => { onJiraConnectRef.current = onJiraConnect }, [onJiraConnect])
  const onGcalConnectRef = useRef(onGcalConnect)
  useEffect(() => { onGcalConnectRef.current = onGcalConnect }, [onGcalConnect])
  const onOpenStandupRef = useRef(onOpenStandup)
  useEffect(() => { onOpenStandupRef.current = onOpenStandup }, [onOpenStandup])

  const dismiss = useCallback((id: string) => {
    if (id === 'standup-not-sent') {
      updateSettingRef.current('standupDismissedDate', getLocalDateStr())
    }
    setDismissedIds(prev => new Set([...prev, id]))
  }, [])

  const checkJira = useCallback(async () => {
    const status = await ltt.jiraGetStatus()
    setJiraConnected(status.connected)
  }, [ltt])

  useEffect(() => {
    checkJira()
    const interval = setInterval(checkJira, 60_000)
    const handler = () => checkJira()
    ltt.on('jira-auth-success', handler)
    window.addEventListener('focus', handler)
    return () => {
      clearInterval(interval)
      ltt.off('jira-auth-success', handler)
      window.removeEventListener('focus', handler)
    }
  }, [checkJira, ltt])

  // Standup time check — every minute
  const lastStandupDate = settings?.lastStandupDate
  const sentTodayRef = useRef<string | null>(null)
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const day = now.getDay()
      const today = getLocalDateStr()
      if (day === 0 || day === 6) { setStandupDue(false); return }
      // If sent today (via event latch OR settings), never show
      if (sentTodayRef.current === today || lastStandupDate === today) { setStandupDue(false); return }
      const afterCutoff = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() >= 30)
      setStandupDue(afterCutoff)
    }
    check()
    const interval = setInterval(check, 60_000)
    const onSent = () => {
      sentTodayRef.current = getLocalDateStr()
      setStandupDue(false)
    }
    window.addEventListener('standup-sent', onSent)
    return () => { clearInterval(interval); window.removeEventListener('standup-sent', onSent) }
  }, [lastStandupDate])

  const gcalConnected = !!settings?.gcalEmail
  const standupDismissed = settings?.standupDismissedDate === todayStr

  const notifications = useMemo<Notification[]>(() => {
    const result: Notification[] = []
    if (!jiraConnected && !dismissedIds.has('jira-disconnected')) {
      result.push({
        id: 'jira-disconnected',
        title: 'Jira disconnected',
        message: 'Reconnect to log time and search issues.',
        actionLabel: 'Connect',
        onAction: () => onJiraConnectRef.current(),
      })
    }
    if (!gcalConnected && !dismissedIds.has('gcal-disconnected')) {
      result.push({
        id: 'gcal-disconnected',
        title: 'Google Calendar not connected',
        message: 'Connect to import meetings as time entries.',
        actionLabel: 'Connect',
        onAction: () => onGcalConnectRef.current(),
      })
    }
    if (standupDue && !standupDismissed && !dismissedIds.has('standup-not-sent')) {
      result.push({
        id: 'standup-not-sent',
        title: 'Standup not sent',
        message: "It's past 10:30 AM — don't forget your standup.",
        actionLabel: 'Open standup',
        onAction: () => onOpenStandupRef.current(),
      })
    }
    return result
  }, [jiraConnected, gcalConnected, standupDue, standupDismissed, dismissedIds])

  return { notifications, dismissNotification: dismiss, notificationCount: notifications.length }
}
