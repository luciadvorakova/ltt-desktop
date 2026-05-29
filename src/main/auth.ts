import http from 'node:http'
import { EventEmitter } from 'node:events'
import { shell } from 'electron'
import { supabase } from './supabase'
import { store } from './store'

export const authEmitter = new EventEmitter()

export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'http://localhost:7429/auth', skipBrowserRedirect: true },
  })
  if (error || !data.url) {
    console.error('[auth] signInWithGoogle error:', error)
    return
  }

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/auth')) {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<html><body><script>window.close()</script><p>Authentication complete. You can close this tab.</p></body></html>')
    server.close()
    const session = await handleAuthCallback(`http://localhost:7429${req.url}`)
    if (session) authEmitter.emit('auth-success', session)
  })

  server.listen(7429, '127.0.0.1', () => {
    console.log('[auth] OAuth callback server listening on :7429')
  })
  server.on('error', (err) => console.error('[auth] callback server error:', err))

  await shell.openExternal(data.url)
}

export async function handleAuthCallback(url: string): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(url)
      if (error || !data.session) {
        console.error('[auth] exchangeCodeForSession error:', error)
        return null
      }
      const session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token }
      store.set('session', session)
      return session
    }
    // Implicit flow fallback: tokens in hash fragment
    const hash = parsed.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (!access_token || !refresh_token) {
      console.error('[auth] handleAuthCallback: missing tokens in URL')
      return null
    }
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      console.error('[auth] setSession error:', error)
      return null
    }
    const session = { access_token, refresh_token }
    store.set('session', session)
    return session
  } catch (err) {
    console.error('[auth] handleAuthCallback error:', err)
    return null
  }
}

export async function refreshSession(): Promise<{ access_token: string; refresh_token: string } | null> {
  const stored = store.get('session')
  if (!stored) return null

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: stored.refresh_token })
  if (error || !data.session) {
    console.error('[auth] refreshSession error:', error)
    store.set('session', null)
    return null
  }
  const session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  }
  store.set('session', session)
  await supabase.auth.setSession(session)
  return session
}

export function startSessionRefreshInterval(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    refreshSession()
  }, 55 * 60 * 1000)
}

export function getSession(): { access_token: string; refresh_token: string } | null {
  return store.get('session') ?? null
}
