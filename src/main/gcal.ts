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
    let created = 0

    for (const event of events) {
      if (shouldSkip(event)) continue

      const name = event.summary ?? 'Calendar event'
      if (currentEntries.some(e => e.name === name && e.ts >= todayStartMs)) continue

      const ms = new Date(event.end.dateTime!).getTime() - new Date(event.start.dateTime!).getTime()
      const ts = new Date(event.start.dateTime!).getTime()
      const now = new Date().toISOString()

      const { data: row, error } = await supabase
        .from('time_entries')
        .insert({
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

      if (error) { console.error('[gcal] insert failed:', error); continue }
      if (row) {
        const r = row as Record<string, unknown>
        const entry: TimeEntry = {
          id: Number(r.id),
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
