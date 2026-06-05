import { store } from './store'
import { supabase } from './supabase'
import { ensureSession } from './auth'
import { currentEntries } from './timer'
import { refreshGCalToken } from './gcal-auth'
import type { TimeEntry } from '../types/index'

interface GCalEvent {
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { self?: boolean; responseStatus?: string }[]
}

function shouldSkip(event: GCalEvent): boolean {
  if (!event.start.dateTime) return true // all-day event
  const selfAttendee = event.attendees?.find(a => a.self)
  if (selfAttendee?.responseStatus === 'declined') return true
  const ms = new Date(event.end.dateTime ?? '').getTime() - new Date(event.start.dateTime ?? '').getTime()
  if (ms < 5 * 60 * 1000) return true
  return false
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
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '100')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { console.error('[gcal] fetch events failed:', res.status, await res.text()); return false }

    const data = await res.json() as { items?: GCalEvent[] }
    const events = data.items ?? []
    const todayStr = new Date().toISOString().slice(0, 10)
    const deletedEntries: { name: string; date: string }[] = store.get('deletedEntryNames') ?? []
    const deletedNames = new Set(deletedEntries.filter(e => e.date === todayStr).map(e => e.name))
    let created = 0

    for (const event of events) {
      const isDeclined = event.attendees?.find(a => a.self)?.responseStatus === 'declined'
      const durationMs = event.start.dateTime && event.end.dateTime
        ? new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()
        : 0
      const eventName = event.summary ?? 'Calendar event'
      const isDuplicate = currentEntries.some(e => e.ts >= todayStartMs && (e.name === eventName || e.jiraDesc === eventName))
      const isDeleted = deletedNames.has(eventName)
      console.log('[gcal] event:', event.summary, 'allDay:', !event.start?.dateTime, 'declined:', isDeclined, 'tooShort:', durationMs < 5 * 60 * 1000, 'duplicate:', isDuplicate, 'deleted:', isDeleted)

      if (shouldSkip(event)) continue

      const name = eventName
      if (isDuplicate || isDeleted) continue

      const ms = 0
      const ts = new Date(event.start.dateTime!).getTime()
      const now = new Date().toISOString()

      const entryId = Date.now() + created
      const { data: row, error } = await supabase
        .from('time_entries')
        .insert({
          id: entryId,
          user_id: userId,
          name,
          ms,
          ts,
          updated_at: now,
          jira_sent: false,
          untracked: false,
          carried_over: false,
          removed_from_timer: false,
          deleted_from_bulk: false,
        })
        .select()
        .single()

      if (error) { console.log('[gcal] insert failed:', error.message, error.code); continue }
      if (row) {
        const entry: TimeEntry = {
          id: entryId,
          name,
          ms,
          ts,
          updatedAt: now,
          jiraSent: false,
          untracked: false,
          carriedOver: false,
          removedFromTimer: false,
          deletedFromBulk: false,
        }
        currentEntries.push(entry)
      }
      created++
    }

    console.log('[gcal] sync done, created:', created, 'of', events.length, 'events')

    const updatedSettings = { ...freshSettings, gcalLastSyncDate: todayStr }
    store.set('settings', updatedSettings)

    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...updatedSettings }, { onConflict: 'user_id' })

    return created > 0
  } catch (err) {
    console.error('[gcal] syncGoogleCalendar error:', err)
    return false
  }
}
