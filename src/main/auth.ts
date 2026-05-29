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
  console.log('[AUTH] redirectTo URL:', data.url)

  const server = http.createServer(async (req, res) => {
    console.log('callback received, url:', req.url)

    // First leg: browser lands here after OAuth redirect.
    // Hash fragment (#access_token=...) is browser-only, never sent to server.
    // Return a page that forwards the full location (hash or search) via fetch.
    if (req.url === '/auth' || req.url === '/auth?') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`<html><body><script>
        const params = window.location.hash.slice(1) || window.location.search.slice(1);
        fetch('/auth/complete?' + params).then(() => window.close());
      </script><p>Completing sign-in...</p></body></html>`)
      return
    }

    // Second leg: browser POSTs the tokens back via fetch.
    if (req.url?.startsWith('/auth/complete')) {
      res.writeHead(200)
      res.end()
      server.close()
      const result = await handleAuthCallback(`http://localhost:7429${req.url}`)
      console.log('handleAuthCallback result:', result)
      if (result) {
        console.log('[AUTH] emitting auth-success')
        authEmitter.emit('auth-success', result)
        console.log('[AUTH] emitted')
      }
      return
    }

    res.writeHead(404)
    res.end()
  })

  server.listen(7429, () => {
    console.log('[AUTH] starting localhost server on port 7429')
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
    // Implicit flow: tokens forwarded as query params (from hash via browser fetch)
    const params = parsed.searchParams
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
