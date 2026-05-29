import { useState, useEffect, useCallback } from 'react'
import { useLtt } from './useLtt'

interface Session {
  access_token: string
  refresh_token: string
}

interface UseAuthResult {
  session: Session | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const ltt = useLtt()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.ltt) return

    ltt.getSession().then((s) => {
      setSession(s)
      setLoading(false)
    })

    const onAuthSuccess = (s: unknown) => setSession(s as Session)
    ltt.on('auth-success', onAuthSuccess)
    return () => ltt.off('auth-success', onAuthSuccess)
  }, [ltt])

  const signIn = useCallback(async () => {
    await ltt.signIn()
  }, [ltt])

  const signOut = useCallback(async () => {
    await ltt.signOut()
    setSession(null)
  }, [ltt])

  return { session, loading, signIn, signOut }
}
