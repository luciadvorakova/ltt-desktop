import { useState, useEffect, useCallback } from 'react'
import { useLtt } from './useLtt'
import { useSettings } from './useSettings'

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

  const todayStr = new Date().toISOString().slice(0, 10)

  const dismiss = useCallback((id: string) => {
    if (id === 'standup-not-sent') {
      updateSetting('standupDismissedDate', todayStr)
    }
    setDismissedIds(prev => new Set([...prev, id]))
  }, [todayStr, updateSetting])

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
  const [standupDue, setStandupDue] = useState(false)
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const afterCutoff = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() >= 30)
      const notSentToday = settings?.lastStandupDate !== todayStr
      setStandupDue(afterCutoff && notSentToday)
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [settings?.lastStandupDate, todayStr])

  const gcalConnected = !!settings?.gcalEmail
  const standupDismissed = settings?.standupDismissedDate === todayStr

  const notifications: Notification[] = []

  if (!jiraConnected && !dismissedIds.has('jira-disconnected')) {
    notifications.push({
      id: 'jira-disconnected',
      title: 'Jira disconnected',
      message: 'Reconnect to log time and search issues.',
      actionLabel: 'Connect',
      onAction: onJiraConnect,
    })
  }

  if (!gcalConnected && !dismissedIds.has('gcal-disconnected')) {
    notifications.push({
      id: 'gcal-disconnected',
      title: 'Google Calendar not connected',
      message: 'Connect to import meetings as time entries.',
      actionLabel: 'Connect',
      onAction: onGcalConnect,
    })
  }

  if (standupDue && !standupDismissed && !dismissedIds.has('standup-not-sent')) {
    notifications.push({
      id: 'standup-not-sent',
      title: 'Standup not sent',
      message: "It's past 10:30 AM — don't forget your standup.",
      actionLabel: 'Open standup',
      onAction: onOpenStandup,
    })
  }

  return { notifications, dismissNotification: dismiss, notificationCount: notifications.length }
}
