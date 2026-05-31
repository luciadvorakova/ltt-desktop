import { useState } from 'react'
import { useLtt } from '../hooks/useLtt'
import type { TimeEntry } from '../../../types/index'

const formatMs = (ms: number): string => {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const formatMsShort = (ms: number): string => {
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export function BulkSendView({
  entries,
  updateEntry,
  onBack,
}: {
  entries: TimeEntry[]
  updateEntry: (entry: TimeEntry) => Promise<void>
  onBack: () => void
}) {
  const ltt = useLtt()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const eligible = entries.filter(e => !!e.jiraKey && e.ms > 0 && !e.jiraSent)
  const todayEligible = eligible.filter(e => e.ts >= todayStart.getTime())
  const olderEligible = eligible.filter(e => e.ts < todayStart.getTime())

  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(todayEligible.map(e => e.id))
  )
  const [descs, setDescs] = useState<Map<number, string>>(
    () => new Map(eligible.map(e => [e.id, e.jiraDesc ?? '']))
  )
  const [editingDescId, setEditingDescId] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const selectedEntries = eligible.filter(e => checked.has(e.id))
  const totalMs = selectedEntries.reduce((sum, e) => sum + e.ms, 0)

  const toggleCheck = (id: number) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (selectedEntries.length === 0 || sending) return
    setSending(true)
    for (const entry of selectedEntries) {
      const desc = descs.get(entry.id) ?? entry.jiraDesc ?? ''
      const result = await ltt.jiraLogTime(entry.jiraKey!, entry.ms, desc)
      if (result.success) {
        await updateEntry({ ...entry, jiraSent: true, jiraDesc: desc, updatedAt: new Date().toISOString() })
      } else {
        console.error('[bulk] logTime failed for', entry.jiraKey, result.error)
      }
    }
    setSending(false)
    onBack()
  }

  const renderEntry = (entry: TimeEntry, isFirst: boolean, isOlder: boolean) => {
    const isChecked = checked.has(entry.id)
    const desc = descs.get(entry.id) ?? ''
    const dimmed = isOlder && !isChecked

    return (
      <div
        key={entry.id}
        style={{
          padding: '8px 14px',
          borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          opacity: dimmed ? 0.35 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            onClick={() => toggleCheck(entry.id)}
            style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${isChecked ? 'rgba(80,180,100,0.6)' : 'rgba(255,255,255,0.25)'}`,
              background: isChecked ? 'rgba(80,180,100,0.3)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isChecked && <span style={{ fontSize: 9, color: '#7fd89a', fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'rgba(255,255,255,0.9)',
          }}>
            {entry.name}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
          }}>
            {formatMs(entry.ms)}
          </span>
        </div>

        <div
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setEditingDescId(entry.id)}
          onBlur={e => {
            const text = e.currentTarget.textContent?.trim() ?? ''
            setDescs(prev => new Map(prev).set(entry.id, text))
            setEditingDescId(null)
          }}
          style={{
            paddingLeft: 23, fontSize: 10, outline: 'none', cursor: 'text',
            minHeight: '1.2em',
            color: desc || editingDescId === entry.id ? 'rgba(255,255,255,0.35)' : 'rgba(255,110,110,0.5)',
            fontStyle: !desc && editingDescId !== entry.id ? 'italic' : 'normal',
          }}
        >
          {editingDescId === entry.id ? desc : (desc || 'Add description...')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 23 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 99,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.5)',
          }}>
            {entry.jiraKey}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 99,
            border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)',
          }}>
            {formatDate(entry.ts)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
        }}>
          ‹ Timer
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(120,210,160,0.85)' }}>
          {selectedEntries.length} selected · {formatMsShort(totalMs)}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {todayEligible.length > 0 && (
          <>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
              padding: '8px 14px 4px',
            }}>
              Today
            </div>
            {todayEligible.map((e, i) => renderEntry(e, i === 0, false))}
          </>
        )}
        {olderEligible.length > 0 && (
          <>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
              padding: '8px 14px 4px',
            }}>
              Older (unsent)
            </div>
            {olderEligible.map((e, i) => renderEntry(e, i === 0, true))}
          </>
        )}
        {eligible.length === 0 && (
          <div style={{
            color: 'rgba(255,255,255,0.22)', fontSize: 12,
            padding: '28px 16px', textAlign: 'center',
          }}>
            No unsent entries with time
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
        }}>
          {selectedEntries.length} selected · {formatMsShort(totalMs)}
        </span>
        <button
          onClick={handleSend}
          disabled={selectedEntries.length === 0 || sending}
          style={{
            fontSize: 9, padding: '3px 7px', borderRadius: 99,
            background: 'rgba(80,180,100,0.28)',
            border: '1px solid rgba(80,180,100,0.45)',
            color: '#7fd89a',
            cursor: selectedEntries.length === 0 || sending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
            opacity: selectedEntries.length === 0 || sending ? 0.5 : 1,
          }}
        >
          {sending ? 'Sending…' : '↑ Send to Jira'}
        </button>
      </div>
    </div>
  )
}
