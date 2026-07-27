import { store } from './store'
import { supabase } from './supabase'
import { ensureSession } from './auth'
import { currentEntries } from './timer'
import { refreshGCalToken } from './gcal-auth'
import { scheduleMeetingNotifications } from './meeting-notifications'
import type { TimeEntry } from '../types/index'

interface GCalEvent {
  id?: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { self?: boolean; responseStatus?: string }[]
  hangoutLink?: string
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }
}

function shouldSkip(event: GCalEvent): boolean {
  if (!event.start.dateTime) return true // all-day event
  const selfAttendee = event.attendees?.find(a => a.self)
  if (selfAttendee?.responseStatus === 'declined') return true
  const ms = new Date(event.end.dateTime ?? '').getTime() - new Date(event.start.dateTime ?? '').getTime()
  if (ms < 5 * 60 * 1000) return true
  return false
}

function nextWeekday(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

async function fetchAndInsertEvents(
  token: string,
  userId: string,
  timeMin: string,
  timeMax: string,
  startMs: number,
  tab: 'today' | 'tomorrow',
  dateStr: string,
): Promise<TimeEntry[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '100')

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) { console.error('[gcal] fetch events failed:', res.status, await res.text()); return [] }

  const data = await res.json() as { items?: GCalEvent[] }
  const events = data.items ?? []
  const deletedEntries: { name: string; date: string }[] = store.get('deletedEntryNames') ?? []
  const deletedNames = new Set(deletedEntries.filter(e => e.date === dateStr).map(e => e.name))
  let created = 0
  const newEntries: TimeEntry[] = []

  for (const event of events) {
    const isDeclined = event.attendees?.find(a => a.self)?.responseStatus === 'declined'
    const durationMs = event.start.dateTime && event.end.dateTime
      ? new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()
      : 0
    const eventName = event.summary ?? 'Calendar event'
    const gcalEventId = event.id ?? null
    const meetLink = event.hangoutLink
      ?? event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
      ?? undefined
    const isDuplicate = currentEntries.some(e =>
      (gcalEventId && e.gcalEventId === gcalEventId) ||
      (e.ts >= startMs && (e.name === eventName || e.jiraDesc === eventName))
    )
    const isDeleted = deletedNames.has(eventName)
    console.log('[gcal] event:', event.summary, 'tab:', tab, 'allDay:', !event.start?.dateTime, 'declined:', isDeclined, 'tooShort:', durationMs < 5 * 60 * 1000, 'duplicate:', isDuplicate, 'deleted:', isDeleted)

    if (shouldSkip(event)) continue
    if (isDuplicate || isDeleted) continue

    const ms = 0
    const ts = new Date(event.start.dateTime!).getTime()
    const gcalEndTime = new Date(event.end.dateTime!).getTime()
    const now = new Date().toISOString()

    const entryId = Date.now() + created
    const { data: row, error } = await supabase
      .from('time_entries')
      .insert({
        id: entryId,
        user_id: userId,
        name: eventName,
        ms,
        ts,
        updated_at: now,
        jira_sent: false,
        untracked: false,
        carried_over: false,
        removed_from_timer: false,
        deleted_from_bulk: false,
        gcal_event_id: gcalEventId,
        gcal_end_time: gcalEndTime,
        gcal_meet_link: meetLink ?? null,
        is_meeting: true,
        tab,
      })
      .select()
      .single()

    if (error) { console.log('[gcal] insert failed:', error.message, error.code); continue }
    if (row) {
      const entry: TimeEntry = {
        id: entryId,
        name: eventName,
        ms,
        ts,
        updatedAt: now,
        jiraSent: false,
        untracked: false,
        carriedOver: false,
        removedFromTimer: false,
        deletedFromBulk: false,
        gcalEventId: gcalEventId ?? undefined,
        gcalEndTime,
        gcalMeetLink: meetLink,
        isMeeting: true,
        tab,
      }
      currentEntries.push(entry)
      newEntries.push(entry)
    }
    created++
  }

  console.log('[gcal] sync done for', tab, ', created:', created, 'of', events.length, 'events')
  return newEntries
}

export async function syncGoogleCalendar(): Promise<boolean> {
  const settings = store.get('settings')
  console.log('[gcal] syncGoogleCalendar called, hasRefreshToken:', !!settings?.gcalRefreshToken, 'hasEmail:', !!settings?.gcalEmail)
  if (!settings?.gcalRefreshToken) return false

  const todayStr = new Date().toISOString().split('T')[0]
  if (settings.gcalLastSyncDate === todayStr) return false

  const token = await refreshGCalToken()
  if (!token) { console.error('[gcal] token refresh failed — cannot sync'); return false }
  console.log('[gcal] token refreshed successfully')

  // Re-read settings after refresh so we have the updated access token in updatedSettings later
  const freshSettings = store.get('settings')!

  await ensureSession()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) { console.log('[gcal] sync skipped: no user'); return false }
  const userId = user.id

  const today = new Date()
  const todayStartMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  try {
    // Sync today's events — notifications fire only for these
    const todayEntries = await fetchAndInsertEvents(
      token, userId, timeMin, timeMax, todayStartMs, 'today', todayStr,
    )
    scheduleMeetingNotifications(todayEntries)

    // Sync next weekday's events into the Tomorrow tab
    const tomorrow = nextWeekday(today)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    let tomorrowSyncDate = freshSettings.gcalTomorrowSyncDate

    let tomorrowCreated = 0
    if (tomorrowSyncDate !== tomorrowStr) {
      const tomorrowStartMs = tomorrow.getTime()
      const tomorrowTimeMin = tomorrow.toISOString()
      const tomorrowTimeMax = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1).toISOString()
      const tomorrowEntries = await fetchAndInsertEvents(
        token, userId, tomorrowTimeMin, tomorrowTimeMax, tomorrowStartMs, 'tomorrow', tomorrowStr,
      )
      tomorrowCreated = tomorrowEntries.length
      tomorrowSyncDate = tomorrowStr
    }

    const updatedSettings = { ...freshSettings, gcalLastSyncDate: todayStr, gcalTomorrowSyncDate: tomorrowSyncDate }
    store.set('settings', updatedSettings)

    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: updatedSettings,
        client_colors: updatedSettings.clientColors ? JSON.stringify(updatedSettings.clientColors) : null,
        theme: updatedSettings.theme ?? 'dark',
      }, { onConflict: 'user_id' })

    return (todayEntries.length + tomorrowCreated) > 0
  } catch (err) {
    console.error('[gcal] syncGoogleCalendar error:', err)
    return false
  }
}
