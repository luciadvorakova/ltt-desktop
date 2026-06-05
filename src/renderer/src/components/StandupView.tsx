import { useState, useRef, useEffect } from 'react'
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

function StandupCard({ text, onChange, onRemove, onDragStart, onDragOver, onDrop, dragOver, autoFocus }: {
  text: string
  onChange: (text: string) => void
  onRemove: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  dragOver: boolean
  autoFocus?: boolean
}) {
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (autoFocus && spanRef.current) {
      spanRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(spanRef.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [autoFocus])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.07)',
        border: dragOver ? '1px solid rgba(100,160,255,0.6)' : '1px solid rgba(255,255,255,0.1)',
        borderTop: dragOver ? '2px solid rgba(100,160,255,0.6)' : undefined,
        borderRadius: 8, padding: '6px 8px', marginBottom: 4,
      }}
    >
      <span
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', cursor: 'grab', flexShrink: 0, lineHeight: 1 }}
        draggable={false}
      >
        ⠿
      </span>
      <span
        ref={spanRef}
        contentEditable
        suppressContentEditableWarning
        onInput={e => onChange((e.target as HTMLSpanElement).textContent ?? '')}
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', flex: 1, outline: 'none' }}
      >
        {text}
      </span>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  )
}

function CardList({ cards, setCards }: { cards: string[]; setCards: (fn: (prev: string[]) => string[]) => void }) {
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [autoFocusIndex, setAutoFocusIndex] = useState<number | null>(null)

  const handleDrop = (toIndex: number) => {
    const fromIndex = dragIndexRef.current
    if (fromIndex === null || fromIndex === toIndex) { setDragOverIndex(null); return }
    setCards(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  return (
    <div>
      {cards.map((text, i) => (
        <StandupCard
          key={i}
          text={text}
          autoFocus={autoFocusIndex === i}
          onChange={val => setCards(prev => prev.map((c, j) => j === i ? val : c))}
          onRemove={() => { setCards(prev => prev.filter((_, j) => j !== i)); setAutoFocusIndex(null) }}
          onDragStart={() => { dragIndexRef.current = i; setDragOverIndex(null) }}
          onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }}
          onDrop={() => handleDrop(i)}
          dragOver={dragOverIndex === i}
        />
      ))}
      <div
        onClick={() => {
          setCards(prev => [...prev, ''])
          setAutoFocusIndex(cards.length)
        }}
        style={{
          border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px',
          background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          fontSize: 10, color: 'rgba(255,255,255,0.25)',
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
        <span>Add task</span>
      </div>
    </div>
  )
}

export function StandupView({ entries, onBack }: { entries: TimeEntry[]; onBack: () => void }) {
  const ltt = useLtt()
  const { settings, updateSetting } = useSettings()

  const channel = settings?.slackChannel ?? ''
  const userId = settings?.slackUserId ?? ''

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { start: prevStart, end: prevEnd } = getPreviousRange()

  const previousEntries = entries.filter(e => {
    if (!e.jiraSent) return false
    const updated = new Date(e.updatedAt).getTime()
    return updated >= prevStart && updated < prevEnd
  })
  const todayEntries = entries.filter(e => {
    if (e.removedFromTimer) return false
    if (e.jiraSent) return e.ts >= todayStart.getTime()
    return true
  })

  const [accomplishedCards, setAccomplishedCards] = useState<string[]>(() => previousEntries.map(formatEntry))
  const [workingOnCards, setWorkingOnCards]       = useState<string[]>(() => todayEntries.map(formatEntry))
  const [problems, setProblems]                   = useState('')
  const [share, setShare]                         = useState('')
  const [sending, setSending]                     = useState(false)

  const handleSend = async () => {
    if (sending) return
    setSending(true)
    const accomplished = accomplishedCards.filter(Boolean).join('\n')
    const workingOn = workingOnCards.filter(Boolean).join('\n')
    const result = await ltt.slackSendStandup({ channel, userId, accomplished, workingOn, problems, share })
    if (result.success) {
      await updateSetting('lastStandupDate', new Date().toISOString().slice(0, 10))
    } else {
      console.error('[standup] send failed:', result.error)
    }
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
          <CardList cards={accomplishedCards} setCards={setAccomplishedCards} />
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: 13 }}>⏩</span>
            <span style={labelStyle}>I will work on</span>
            <span style={sourceStyle}>auto-filled from today</span>
          </div>
          <CardList cards={workingOnCards} setCards={setWorkingOnCards} />
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
