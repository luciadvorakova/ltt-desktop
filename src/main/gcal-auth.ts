import http from 'node:http'
import { shell } from 'electron'
import { EventEmitter } from 'events'
import { store } from './store'
import { supabase } from './supabase'
import { ensureSession } from './auth'

const GCAL_REDIRECT_URI = 'http://localhost:7430/gcal'
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

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/gcal')) { res.writeHead(404); res.end(); return }

    const parsed = new URL(req.url, 'http://localhost:7430')
    const code = parsed.searchParams.get('code')
    const error = parsed.searchParams.get('error')

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<html><body><p>Google Calendar connected. You can close this tab.</p></body></html>')
    server.close()

    if (error || !code) {
      console.error('[gcal] OAuth callback error:', error)
      return
    }

    await exchangeCodeForTokens(code)
  })

  server.listen(7430, () => console.log('[gcal] callback server listening on port 7430'))
  server.on('error', (err) => console.error('[gcal] callback server error:', err))

  await shell.openExternal(url.toString())
}

async function exchangeCodeForTokens(code: string): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[gcal] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set')
    return
  }

  try {
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
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number; error?: string; error_description?: string }
    if (!tokens.access_token) {
      console.error('[gcal] token exchange failed:', tokens.error, tokens.error_description)
      return
    }

    const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const me = await meRes.json() as { email?: string }

    const updated = {
      ...(store.get('settings') ?? {}),
      gcalEmail: me.email ?? '',
      gcalAccessToken: tokens.access_token,
      gcalRefreshToken: tokens.refresh_token,
      gcalTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }
    store.set('settings', updated)
    console.log('[gcal] connected, email:', me.email)

    // Push to Supabase
    await ensureSession()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        settings: updated,
        client_colors: updated.clientColors ? JSON.stringify(updated.clientColors) : null,
        theme: updated.theme ?? 'dark',
      }, { onConflict: 'user_id' })
    }

    gcalAuthEmitter.emit('gcal-auth-success')
  } catch (err) {
    console.error('[gcal] exchangeCodeForTokens error:', err)
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
      if (tokens.error === 'invalid_grant') {
        const s = store.get('settings') ?? {}
        store.set('settings', { ...s, gcalAccessToken: undefined, gcalRefreshToken: undefined, gcalTokenExpiry: undefined, gcalEmail: undefined })
        gcalAuthEmitter.emit('gcal-auth-expired')
      }
      return null
    }

    store.set('settings', {
      ...store.get('settings'),
      gcalAccessToken: tokens.access_token,
      gcalTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })

    // Push refreshed gcal token to Supabase
    try {
      await ensureSession()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const s = store.get('settings')
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          settings: s,
          client_colors: s?.clientColors ? JSON.stringify(s.clientColors) : null,
          theme: s?.theme ?? 'dark',
        }, { onConflict: 'user_id' })
      }
    } catch { /* ignore */ }

    console.log('[gcal] token refreshed successfully, expires in:', tokens.expires_in, 's')
    return tokens.access_token
  } catch (err) {
    console.error('[gcal] refreshGCalToken error:', err)
    return null
  }
}

export async function ensureGCalToken(): Promise<string | null> {
  const settings = store.get('settings')
  if (!settings?.gcalRefreshToken) return null
  const expiry = settings.gcalTokenExpiry ? new Date(settings.gcalTokenExpiry).getTime() : 0
  if (Date.now() > expiry - 10 * 60 * 1000) {
    return await refreshGCalToken()
  }
  return settings.gcalAccessToken ?? null
}

export function startGCalRefreshInterval(): void {
  setInterval(async () => {
    const s = store.get('settings')
    if (!s?.gcalRefreshToken || !s.gcalTokenExpiry) return
    const expiry = new Date(s.gcalTokenExpiry).getTime()
    if (Date.now() > expiry - 10 * 60 * 1000) {
      await refreshGCalToken()
    }
  }, 5 * 60 * 1000)
}
