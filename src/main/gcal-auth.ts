import { shell } from 'electron'
import { EventEmitter } from 'events'
import { store } from './store'

const GCAL_REDIRECT_URI = 'ltt://gcal-auth'
const GCAL_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const gcalAuthEmitter = new EventEmitter()

export async function signInWithGCal(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) { console.error('[gcal] GOOGLE_CLIENT_ID not set'); return }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', GCAL_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GCAL_SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  await shell.openExternal(url.toString())
}

export async function handleGCalCallback(url: string): Promise<void> {
  try {
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')
    if (!code) { console.error('[gcal] no code in callback URL'); return }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) { console.error('[gcal] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set'); return }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: GCAL_REDIRECT_URI,
      }),
    })
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number; error?: string }
    if (!tokens.access_token) { console.error('[gcal] token exchange failed:', tokens); return }

    const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const me = await meRes.json() as { email?: string }

    const existing = store.get('settings') ?? {}
    store.set('settings', {
      ...existing,
      gcalEmail: me.email ?? '',
      gcalAccessToken: tokens.access_token,
      gcalRefreshToken: tokens.refresh_token,
      gcalTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })

    console.log('[gcal] connected, email:', me.email)
    gcalAuthEmitter.emit('gcal-auth-success')
  } catch (err) {
    console.error('[gcal] handleGCalCallback error:', err)
  }
}

export async function refreshGCalToken(): Promise<string | null> {
  const settings = store.get('settings')
  const refreshToken = settings?.gcalRefreshToken
  if (!refreshToken) return null

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) { console.error('[gcal] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set'); return null }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })
    const tokens = await res.json() as { access_token: string; expires_in: number; error?: string; error_description?: string }
    if (!tokens.access_token) {
      console.error('[gcal] token refresh failed:', tokens.error, tokens.error_description)
      return null
    }

    store.set('settings', {
      ...store.get('settings'),
      gcalAccessToken: tokens.access_token,
      gcalTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    console.log('[gcal] token refreshed successfully, expires in:', tokens.expires_in, 's')
    return tokens.access_token
  } catch (err) {
    console.error('[gcal] refreshGCalToken error:', err)
    return null
  }
}

export async function ensureGCalToken(): Promise<string | null> {
  const settings = store.get('settings')
  if (!settings?.gcalAccessToken) return null
  if (settings.gcalTokenExpiry && Date.now() > new Date(settings.gcalTokenExpiry).getTime() - 5 * 60 * 1000) {
    return refreshGCalToken()
  }
  return settings.gcalAccessToken
}
