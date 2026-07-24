import ReactDOM from 'react-dom/client'

declare const window: Window & { ltt?: { notificationClose: (gcalEventId?: string, type?: string) => void; notificationStartTracking: (entryId: string, gcalEventId?: string) => void; notificationStandupDismiss: () => void; notificationOpenStandup: () => void } }

const params = new URLSearchParams(window.location.search)
const type = (params.get('type') ?? '10min') as '10min' | '1min' | 'standup'
const entryId = params.get('entryId') ?? ''
const name = params.get('name') ?? ''
const description = params.get('description') ?? ''
const ts = parseInt(params.get('ts') ?? '0', 10)
const gcalEventId = params.get('gcalEventId') ?? ''
const meetLink = params.get('meetLink') ?? ''

function formatTime(ms: number): string {
  const d = new Date(ms)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function NotificationPopup() {
  if (type === 'standup') {
    return (
      <div style={{
        width: 280,
        background: 'linear-gradient(145deg, #1e1850, #0e1830)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      }}>
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b9dff', flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', flex: 1 }}>
            Standup reminder
          </span>
          <button
            onClick={() => window.ltt?.notificationStandupDismiss()}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>
            Don't forget your standup
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            Your team is waiting in #ag_standups
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }} />
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.25)' }}>
            Due by 11:00 AM
          </div>
          <button
            onClick={() => window.ltt?.notificationOpenStandup()}
            style={{ width: '100%', padding: 7, marginTop: 10, borderRadius: 8, background: 'rgba(60,120,255,0.25)', border: '1px solid rgba(60,120,255,0.45)', color: 'rgba(120,170,255,0.95)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ↑ Send standup
          </button>
        </div>
      </div>
    )
  }

  const minutesUntil = Math.round((ts - Date.now()) / 60_000)
  const dotColor = type === '1min' ? '#f87171' : '#a78bfa'
  const label = type === '1min' ? 'Starting now' : 'Upcoming meeting'

  return (
    <div style={{
      width: 280,
      background: 'linear-gradient(145deg, #1e1850, #0e1830)',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.12)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          ...(type === '1min' ? { animation: 'pulse 1.2s ease-in-out infinite' } : {}),
        }} />
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          flex: 1,
        }}>
          {label}
        </span>
        <button
          onClick={() => window.ltt?.notificationClose(gcalEventId, type)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 14,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>
          {name}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            {description}
          </div>
        )}
        {meetLink && (
          <button
            onClick={() => window.open(meetLink, '_blank')}
            style={{
              fontSize: 9, fontWeight: 600, padding: '3px 9px', borderRadius: 99, marginBottom: 10,
              background: 'transparent', border: '1px solid rgba(130,160,255,0.55)',
              color: 'rgba(150,175,255,0.95)', cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            ▶ Join meeting
          </button>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }} />
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.25)',
        }}>
          Starts at {formatTime(ts)} · in {minutesUntil} minute{minutesUntil !== 1 ? 's' : ''}
        </div>
        {type === '1min' && (
          <button
            onClick={() => window.ltt?.notificationStartTracking(entryId, gcalEventId)}
            style={{
              width: '100%',
              padding: 7,
              marginTop: 10,
              borderRadius: 8,
              background: 'rgba(80,180,100,0.25)',
              border: '1px solid rgba(80,180,100,0.45)',
              color: '#7fd89a',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ▶ Start tracking
          </button>
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<NotificationPopup />)
