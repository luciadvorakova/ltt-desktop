import { shell } from 'electron'
import { supabase } from './supabase'
import { store } from './store'

export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'ltt://auth', skipBrowserRedirect: true },
  })
  if (error || !data.url) {
    console.error('[auth] signInWithGoogle error:', error)
    return
  }
  await shell.openExternal(data.url)
}

export async function handleAuthCallback(url: string): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const hash = new URL(url).hash.slice(1)
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
