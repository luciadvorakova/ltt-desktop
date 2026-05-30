import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { TimerView } from './components/TimerView'

type Tab = 'timer' | 'history' | 'weekly'

function AppShell() {
  const [tab, setTab] = useState<Tab>('timer')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'inherit' }}>
      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['timer', 'history', 'weekly'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'rgba(255,255,255,0.12)' : 'none',
                border: 'none',
                borderRadius: 6,
                color: tab === t ? 'white' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          title="Account"
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', fontSize: 14, height: 28, width: 28 }}
        >
          ↑
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'timer' && <TimerView />}
        {tab === 'history' && <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>history — coming soon</div>}
        {tab === 'weekly' && <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>weekly — coming soon</div>}
      </div>
    </div>
  )
}

export default function App() {
  const { session, loading, signIn } = useAuth()

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

  return <AppShell />
}
