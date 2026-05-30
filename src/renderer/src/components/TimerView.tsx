import type React from 'react'
import { useEntries } from '../hooks/useEntries'
import { useTimer } from '../hooks/useTimer'
import type { TimeEntry } from '../../../types/index'

const dayKey = (ts: number) => new Date(ts).toDateString()

const formatMs = (ms: number): string => {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const formatMsShort = (ms: number): string => {
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const pill: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 4,
  color: 'rgba(255,255,255,0.55)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.3,
  padding: '1px 5px',
}

const footerBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  fontWeight: 600,
  padding: '4px 10px',
}

function actionBtn(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: disabled ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.8)',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit',
    fontSize: 11,
    fontWeight: 600,
    padding: '5px 14px',
  }
}

// ---- Entry row ----

function EntryRow({ entry, isActive, isRunning, displayMs, onPlay, onPause }: {
  entry: TimeEntry
  isActive: boolean
  isRunning: boolean
  displayMs: number
  onPlay: () => void
  onPause: () => void
}) {
  return (
    <div style={{
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
    }}>
      <button
        onClick={isActive && isRunning ? onPause : onPlay}
        style={{
          alignItems: 'center',
          background: isActive ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
          border: 'none',
          borderRadius: '50%',
          color: isActive ? '#4ade80' : 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          display: 'flex',
          flexShrink: 0,
          fontSize: 9,
          height: 26,
          justifyContent: 'center',
          width: 26,
        }}
      >
        {isActive && isRunning ? '⏸' : '▶'}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: 'white',
          fontSize: 12,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entry.name}
        </div>
        {(entry.clientName || entry.jiraKey) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
            {entry.clientName && (
              <span style={pill}>{entry.clientName}</span>
            )}
            {entry.jiraKey && (
              <span style={{ ...pill, color: 'rgba(96,165,250,0.9)' }}>{entry.jiraKey}</span>
            )}
          </div>
        )}
      </div>

      <span style={{
        color: isActive ? 'rgba(74,222,128,0.85)' : 'rgba(255,255,255,0.55)',
        flexShrink: 0,
        fontFamily: 'SF Mono, ui-monospace, monospace',
        fontSize: 11,
      }}>
        {formatMs(displayMs)}
      </span>

      <button style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.22)',
        cursor: 'pointer',
        fontSize: 15,
        lineHeight: 1,
        padding: '0 2px',
      }}>
        …
      </button>
    </div>
  )
}

// ---- Main view ----

export function TimerView() {
  const { entries } = useEntries()
  const { timerState, elapsed, start, pause, stop } = useTimer()

  const today = dayKey(Date.now())
  const todayEntries = entries.filter((e) => dayKey(e.ts) === today)
  const totalMs = todayEntries.reduce((sum, e) => sum + e.ms, 0)

  const activeId = timerState?.activeEntryId ?? null
  const activeEntry = activeId != null ? todayEntries.find((e) => e.id === activeId) ?? null : null

  // baseMs = entry.ms at timer start; elapsed = time since startedAt this run
  const liveMs = timerState
    ? (timerState.running ? timerState.baseMs + elapsed : timerState.baseMs)
    : 0

  const isRunning = timerState?.running ?? false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ---- Large timer display ---- */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 20px 16px',
        textAlign: 'center',
      }}>
        <div style={{
          color: isRunning ? '#4ade80' : 'rgba(255,255,255,0.88)',
          fontFamily: 'SF Mono, ui-monospace, monospace',
          fontSize: 46,
          fontWeight: 200,
          letterSpacing: 3,
          lineHeight: 1,
          marginBottom: 8,
        }}>
          {formatMs(liveMs)}
        </div>

        {activeEntry && (
          <div style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 11,
            letterSpacing: 0.3,
            marginBottom: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {activeEntry.name}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            disabled={!activeEntry || isRunning}
            onClick={() => activeEntry && start(activeEntry.id)}
            style={actionBtn(!activeEntry || isRunning)}
          >
            Start
          </button>
          <button
            disabled={!isRunning}
            onClick={pause}
            style={actionBtn(!isRunning)}
          >
            Pause
          </button>
          <button
            disabled={!activeEntry}
            onClick={stop}
            style={actionBtn(!activeEntry)}
          >
            Save
          </button>
        </div>
      </div>

      {/* ---- Header ---- */}
      <div style={{
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '7px 14px',
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.32)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          Today's Tasks
        </span>
        <button style={{
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: 5,
          color: 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          fontSize: 17,
          lineHeight: 1,
          padding: '1px 7px 2px',
        }}>
          +
        </button>
      </div>

      {/* ---- Entry list ---- */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {todayEntries.length === 0 && (
          <div style={{
            color: 'rgba(255,255,255,0.22)',
            fontSize: 12,
            padding: '28px 16px',
            textAlign: 'center',
          }}>
            No entries today
          </div>
        )}
        {todayEntries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            isActive={activeId === entry.id}
            isRunning={isRunning}
            displayMs={activeId === entry.id ? liveMs : entry.ms}
            onPlay={() => start(entry.id)}
            onPause={pause}
          />
        ))}
      </div>

      {/* ---- Footer ---- */}
      <div style={{
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: 8,
        padding: '10px 14px',
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.32)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          Total Today
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.7)',
          flex: 1,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {formatMsShort(totalMs)}
        </span>
        <button style={footerBtn}>↑ Send to Jira</button>
        <button style={footerBtn}>Standup</button>
      </div>

    </div>
  )
}
