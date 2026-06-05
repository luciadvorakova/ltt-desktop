import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useNotifications } from './hooks/useNotifications'
import { useLtt } from './hooks/useLtt'
import { TimerView } from './components/TimerView'
import { HistoryView } from './components/HistoryView'
import { WeeklyView } from './components/WeeklyView'
import { SettingsView } from './components/SettingsView'

type Tab = 'timer' | 'history' | 'weekly'

interface Session {
  access_token: string
  refresh_token: string
}

function getInitials(accessToken: string): string {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    const fullName: string = payload.user_metadata?.full_name ?? ''
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts[0]?.length >= 1) return parts[0].slice(0, 2).toUpperCase()
  } catch { /* ignore */ }
  return 'LD'
}

function getUserInfo(accessToken: string): { name: string; email: string } {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    return {
      name: payload.user_metadata?.full_name ?? payload.email ?? '',
      email: payload.email ?? '',
    }
  } catch { /* ignore */ }
  return { name: '', email: '' }
}

function AppShell({ session, signOut }: { session: Session; signOut: () => Promise<void> }) {
  const ltt = useLtt()
  const [tab, setTab] = useState<Tab>('timer')
  const [timerResetKey, setTimerResetKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [standupOpen, setStandupOpen] = useState(false)

  const initials = getInitials(session.access_token)
  const { name: _name, email: _email } = getUserInfo(session.access_token)

  const { notifications, dismissNotification, notificationCount } = useNotifications({
    onJiraConnect: () => ltt.jiraSignIn(),
    onGcalConnect: () => ltt.gcalSignIn(),
    onOpenStandup: () => { setSettingsOpen(false); setStandupOpen(true) },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'inherit', position: 'relative' }}>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Pill tab group */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 99,
          padding: 3,
          gap: 2,
        }}>
          {(['timer', 'history', 'weekly'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { if (t === 'timer' && tab === 'timer') setTimerResetKey(k => k + 1); setTab(t); setSettingsOpen(false) }}
              style={{
                fontSize: 10,
                padding: '3px 10px',
                borderRadius: 99,
                color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none',
                background: tab === t ? 'rgba(255,255,255,0.18)' : 'none',
                fontWeight: tab === t ? 600 : 400,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Avatar with notification badge */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            {initials}
          </button>
          {notificationCount > 0 && (
            <div style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#e05252',
              border: '2px solid #0e1830',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              fontWeight: 700,
              color: 'white',
              pointerEvents: 'none',
            }}>
              {notificationCount}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'timer' && <TimerView key={timerResetKey} standupOpen={standupOpen} onStandupClose={() => setStandupOpen(false)} />}
        {tab === 'history' && <HistoryView />}
        {tab === 'weekly' && <WeeklyView />}
        {settingsOpen && (
          <SettingsView
            onClose={() => setSettingsOpen(false)}
            notifications={notifications}
            dismissNotification={dismissNotification}
            signOut={signOut}
          />
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { session, loading, signIn, signOut } = useAuth()

  if (loading) {
    return (
      <div style={{ alignItems: 'center', display: 'flex', height: '100vh', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ background: 'linear-gradient(145deg, #1e1850 0%, #0e1830 100%)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 320, padding: '40px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/digismoothie-logo.svg" style={{ width: 160, marginBottom: 28, opacity: 0.92 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            Agency Time Tracker
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.7, marginBottom: 32 }}>
            Your hours will log themselves. Almost.<br />
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>— LD</span>
          </div>
          <button
            onClick={signIn}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center', background: 'white', border: 'none', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Sign in with Google</span>
          </button>
        </div>
      </div>
    )
  }

  return <AppShell session={session} signOut={signOut} />
}
