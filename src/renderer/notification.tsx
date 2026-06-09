import ReactDOM from 'react-dom/client'

declare const window: Window & { ltt?: { notificationClose: (gcalEventId?: string) => void; notificationStartTracking: (entryId: string, gcalEventId?: string) => void } }

const params = new URLSearchParams(window.location.search)
const type = (params.get('type') ?? '10min') as '10min' | '1min'
const entryId = params.get('entryId') ?? ''
const name = params.get('name') ?? ''
const description = params.get('description') ?? ''
const ts = parseInt(params.get('ts') ?? '0', 10)
const gcalEventId = params.get('gcalEventId') ?? ''

function formatTime(ms: number): string {
  const d = new Date(ms)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function NotificationPopup() {
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
          onClick={() => window.ltt?.notificationClose(gcalEventId)}
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
