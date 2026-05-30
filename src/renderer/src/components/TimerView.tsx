import { useEntries } from '../hooks/useEntries'
import { useTimer } from '../hooks/useTimer'

const dayKey = (ts: number) => new Date(ts).toDateString()

const formatMs = (ms: number): string => {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerView() {
  const { entries } = useEntries()
  const { timerState, elapsed, start, pause } = useTimer()

  const today = dayKey(Date.now())
  const todayEntries = entries.filter((e) => dayKey(e.ts) === today)

  const activeId = timerState?.activeEntryId ?? null
  const isRunning = timerState?.running ?? false
  const liveMs = timerState
    ? (timerState.running ? timerState.baseMs + elapsed : timerState.baseMs)
    : 0

  const totalMs = todayEntries.reduce((sum, e) => sum + e.ms, 0) + (isRunning ? elapsed : 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.28)',
          textTransform: 'uppercase',
        }}>
          Today's Tasks
        </span>
        <button style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.18)',
          fontSize: 15,
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}>
          +
        </button>
      </div>

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {todayEntries.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, padding: '28px 16px', textAlign: 'center' }}>
            No entries today
          </div>
        )}
        {todayEntries.map((entry) => {
          const isActive = activeId === entry.id
          const displayMs = isActive ? liveMs : entry.ms

          return (
            <div
              key={entry.id}
              style={{
                padding: '8px 14px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(80,180,100,0.07)' : 'transparent',
              }}
            >
              {/* Row 1: controls + name + time + menu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                <button
                  onClick={() => isActive ? pause() : start(entry.id)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isActive ? 'rgba(80,180,100,0.3)' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${isActive ? 'rgba(80,180,100,0.6)' : 'rgba(255,255,255,0.18)'}`,
                    color: isActive ? '#7fd89a' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 8,
                    padding: 0,
                  }}
                >
                  {isActive && isRunning ? '⏸' : '▶'}
                </button>

                {isActive && (
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#7fd89a',
                    flexShrink: 0,
                  }} />
                )}

                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  flex: 1,
                  color: isActive ? '#7fd89a' : 'rgba(255,255,255,0.9)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {entry.name}
                </span>

                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? '#7fd89a' : 'rgba(255,255,255,0.55)',
                  flexShrink: 0,
                  fontFamily: 'SF Mono, ui-monospace, monospace',
                }}>
                  {formatMs(displayMs)}
                </span>

                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                  …
                </span>
              </div>

              {/* Row 2: description */}
              {entry.jiraSummary && (
                <div style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.36)',
                  paddingLeft: 29,
                  marginBottom: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {entry.jiraSummary}
                </div>
              )}

              {/* Row 3: pills */}
              {(entry.clientName || entry.jiraKey) && (
                <div style={{ display: 'flex', gap: 5, paddingLeft: 29 }}>
                  {entry.clientName && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: 'rgba(255,255,255,0.32)',
                    }}>
                      {entry.clientName}
                    </span>
                  )}
                  {entry.jiraKey && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.5)',
                    }}>
                      {entry.jiraKey}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 14px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.32)',
        }}>
          Total Today
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button style={{
            fontSize: 9,
            padding: '3px 7px',
            borderRadius: 99,
            background: 'rgba(80,180,100,0.28)',
            border: '1px solid rgba(80,180,100,0.45)',
            color: '#7fd89a',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}>
            Send to Jira
          </button>
          <button style={{
            fontSize: 9,
            padding: '3px 7px',
            borderRadius: 99,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.13)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}>
            Standup
          </button>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'white',
            fontFamily: 'SF Mono, ui-monospace, monospace',
          }}>
            {formatMs(totalMs)}
          </span>
        </div>
      </div>

    </div>
  )
}
