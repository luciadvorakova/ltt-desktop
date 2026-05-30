import { useState, useEffect, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { TimerView } from './components/TimerView'
import { HistoryView } from './components/HistoryView'

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
  const [tab, setTab] = useState<Tab>('timer')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const initials = getInitials(session.access_token)
  const { name, email } = getUserInfo(session.access_token)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'inherit' }}>

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
              onClick={() => setTab(t)}
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

        {/* Avatar + dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
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

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'linear-gradient(145deg, #1e1850, #0e1830)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 12,
              minWidth: 190,
              boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              {/* User info header */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{email}</div>
              </div>
              {/* Menu items */}
              <div style={{ padding: '4px 0' }}>
                <button style={menuItemStyle}>
                  Settings
                </button>
                <button
                  onClick={async () => { setDropdownOpen(false); await signOut() }}
                  style={menuItemStyle}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'timer' && <TimerView />}
        {tab === 'history' && <HistoryView />}
        {tab === 'weekly' && <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>weekly — coming soon</div>}
      </div>
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 14px',
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
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
      <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 16, height: '100vh', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>LTT Desktop</div>
        <button
          onClick={signIn}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 20px' }}
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  return <AppShell session={session} signOut={signOut} />
}
