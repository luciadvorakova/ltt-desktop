import { useState } from 'react'
import { useLtt } from '../hooks/useLtt'
import { useSettings } from '../hooks/useSettings'
import type { TimeEntry } from '../../../types/index'

function formatEntry(e: TimeEntry): string {
  const prefix = e.clientName ?? (e.jiraKey ? (e.jiraSummary ?? e.name) : e.name)
  const desc = e.jiraDesc?.trim()
  return desc ? `${prefix} - ${desc}` : prefix
}

function getPreviousRange(): { start: number; end: number } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()
  const start = new Date(today)
  if (dayOfWeek === 1) {
    start.setDate(today.getDate() - 3) // Monday → Friday
  } else {
    start.setDate(today.getDate() - 1) // any other day → yesterday
  }
  return { start: start.getTime(), end: today.getTime() }
}

export function StandupView({ entries, onBack }: { entries: TimeEntry[]; onBack: () => void }) {
  const ltt = useLtt()
  const { settings } = useSettings()

  const channel = settings?.slackChannel ?? ''
  const userId = settings?.slackUserId ?? ''

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { start: prevStart, end: prevEnd } = getPreviousRange()

  const previousEntries = entries.filter(e => e.ms > 0 && e.ts >= prevStart && e.ts < prevEnd)
  const todayEntries = entries.filter(e => !e.jiraSent && !e.removedFromTimer)

  const [accomplished, setAccomplished] = useState(() => previousEntries.map(formatEntry).join('\n'))
  const [workingOn, setWorkingOn]       = useState(() => todayEntries.map(formatEntry).join('\n'))
  const [problems, setProblems]         = useState('')
  const [share, setShare]               = useState('')
  const [sending, setSending]           = useState(false)

  const handleSend = async () => {
    if (sending) return
    setSending(true)
    const result = await ltt.slackSendStandup({ channel, userId, accomplished, workingOn, problems, share })
    if (!result.success) console.error('[standup] send failed:', result.error)
    setSending(false)
    onBack()
  }

  const taStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'inherit',
    fontSize: 11,
    lineHeight: '1.6',
    padding: '8px 10px',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', flex: 1,
  }
  const sourceStyle: React.CSSProperties = {
    fontSize: 8, color: 'rgba(255,255,255,0.18)', fontWeight: 600, letterSpacing: '0.04em',
  }
  const sectionStyle: React.CSSProperties = {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '9px 14px 10px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .standup-ta:focus { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.15) !important; }
        .standup-ta::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>

      {/* Header */}
      <div
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
          ‹ Timer
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
          {channel || '#standup'}
        </span>
      </div>

      {/* Scrollable sections */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: 13 }}>🚀</span>
            <span style={labelStyle}>I accomplished</span>
            <span style={sourceStyle}>auto-filled from {new Date().getDay() === 1 ? 'friday' : 'yesterday'}</span>
          </div>
          <textarea
            className="standup-ta"
            rows={4}
            value={accomplished}
            onChange={e => setAccomplished(e.target.value)}
            style={taStyle}
          />
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: 13 }}>⏩</span>
            <span style={labelStyle}>I will work on</span>
            <span style={sourceStyle}>auto-filled from today</span>
          </div>
          <textarea
            className="standup-ta"
            rows={3}
            value={workingOn}
            onChange={e => setWorkingOn(e.target.value)}
            style={taStyle}
          />
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: 13 }}>🚨</span>
            <span style={labelStyle}>Possible problems</span>
          </div>
          <textarea
            className="standup-ta"
            rows={2}
            value={problems}
            onChange={e => setProblems(e.target.value)}
            placeholder="Optional"
            style={taStyle}
          />
        </div>

        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: 13 }}>🙋</span>
            <span style={labelStyle}>I would like to share</span>
          </div>
          <textarea
            className="standup-ta"
            rows={2}
            value={share}
            onChange={e => setShare(e.target.value)}
            placeholder="Optional"
            style={taStyle}
          />
        </div>

      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.15)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.03em' }}>
          {channel || '#standup'}
        </span>
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            fontSize: 9, padding: '3px 7px', borderRadius: 99,
            background: 'rgba(60,120,255,0.28)',
            border: '1px solid rgba(60,120,255,0.45)',
            color: 'rgba(120,170,255,0.9)',
            cursor: sending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
            opacity: sending ? 0.5 : 1,
          }}
        >
          {sending ? 'Sending…' : '↑ Send to Slack'}
        </button>
      </div>
    </div>
  )
}
