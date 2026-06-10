import type { TimeEntry } from '../types/index'
import { showMeetingNotification, isDismissed } from './notification-window'

const scheduled = new Map<string, NodeJS.Timeout[]>()

export function scheduleMeetingNotifications(entries: TimeEntry[]): void {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartMs = todayStart.getTime()
  const todayEndMs = todayStartMs + 24 * 60 * 60 * 1000
  const now = Date.now()

  for (const entry of entries) {
    if (!entry.gcalEventId) continue
    if (entry.ts < todayStartMs || entry.ts >= todayEndMs) continue

    const timers: NodeJS.Timeout[] = []

    const tenMinBefore = entry.ts - 10 * 60 * 1000 - now
    if (tenMinBefore > 0) {
      timers.push(setTimeout(() => {
        if (!isDismissed(entry.gcalEventId!, '10min')) showMeetingNotification(entry, '10min')
      }, tenMinBefore))
    }

    const oneMinBefore = entry.ts - 1 * 60 * 1000 - now
    if (oneMinBefore > 0) {
      timers.push(setTimeout(() => {
        if (!isDismissed(entry.gcalEventId!, '1min')) showMeetingNotification(entry, '1min')
      }, oneMinBefore))
    }

    if (timers.length > 0) {
      clearMeetingNotificationsForId(entry.gcalEventId)
      scheduled.set(entry.gcalEventId, timers)
    }
  }
}

function clearMeetingNotificationsForId(gcalEventId: string): void {
  const timers = scheduled.get(gcalEventId)
  if (timers) {
    timers.forEach(t => clearTimeout(t))
    scheduled.delete(gcalEventId)
  }
}

export function clearMeetingNotifications(): void {
  for (const timers of scheduled.values()) {
    timers.forEach(t => clearTimeout(t))
  }
  scheduled.clear()
}
