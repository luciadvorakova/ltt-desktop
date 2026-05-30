import { useState, useMemo, useRef, useEffect } from 'react'
import { useEntries } from '../hooks/useEntries'
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

function getDayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today)) return 'TODAY'
  if (same(d, yesterday)) return 'YESTERDAY'
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${DAYS[d.getDay()]} — ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function parseMin(input: string): number | null {
  const n = parseInt(input.trim(), 10)
  if (isNaN(n) || n < 0) return null
  return n * 60000
}

function MenuItem({ icon, label, color, onAction }: { icon: string; label: string; color?: string; onAction?: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 13px', fontSize: 11, color: color ?? 'rgba(255,255,255,0.7)', cursor: 'pointer', background: hovered ? 'rgba(255,255,255,0.07)' : 'none', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onAction}
    >
      <span style={{ fontSize: 12, color: color ? color : 'rgba(255,255,255,0.3)', width: 16, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}

const menuDivider = <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

function EntryMenu({ ms, open, onOpen, onClose, onDelete, onAddTime, onEditTime }: {
  ms: number; open: boolean; onOpen: () => void; onClose: () => void
  onDelete: () => void; onAddTime: (ms: number) => void; onEditTime: (ms: number) => void
}) {
  const [above, setAbove] = useState(false)
  const [expandedTime, setExpandedTime] = useState<'add' | 'edit' | null>(null)
  const [addVal, setAddVal] = useState('')
  const [editVal, setEditVal] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (!open) setExpandedTime(null) }, [open])

  useEffect(() => {
    if (!open) return
    document.addEventListener('mousedown', onClose)
    return () => document.removeEventListener('mousedown', onClose)
  }, [open, onClose])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setAbove(rect.bottom > window.innerHeight - 200)
    }
    open ? onClose() : onOpen()
  }

  const timeRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 13px 7px 38px' }
  const timeInputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'white', fontSize: 11, fontFamily: 'inherit', padding: '3px 7px', width: 52, textAlign: 'center', outline: 'none' }
  const timeHintStyle: React.CSSProperties = { fontSize: 9, color: 'rgba(255,255,255,0.25)' }
  const timeBtnStyle: React.CSSProperties = { fontSize: 9, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }

  const handleAdd = () => {
    const parsed = parseMin(addVal)
    if (parsed !== null) { onAddTime(parsed); onClose() }
  }
  const handleEdit = () => {
    const parsed = parseMin(editVal)
    if (parsed !== null) { onEditTime(parsed); onClose() }
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <button
        ref={btnRef}
        style={{ background: 'none', border: 'none', padding: 0, paddingBottom: 1, margin: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 10, lineHeight: 1, flexShrink: 0, letterSpacing: 1 }}
        onMouseDown={handleClick}
      >
        •••
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', right: 0, ...(above ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }), background: 'linear-gradient(145deg, #1e1850, #0e1830)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, minWidth: 180, boxShadow: '0 8px 28px rgba(0,0,0,0.6)', zIndex: 100, overflow: 'hidden' }}
        >
          <div style={{ padding: '4px 0' }}>
            <MenuItem icon="⏱" label="Add time manually" onAction={() => { setAddVal(''); setExpandedTime(prev => prev === 'add' ? null : 'add') }} />
            {expandedTime === 'add' && (
              <div style={timeRowStyle} onMouseDown={e => e.stopPropagation()}>
                <input autoFocus value={addVal} onChange={e => setAddVal(e.target.value)} style={timeInputStyle} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setExpandedTime(null) }} />
                <span style={timeHintStyle}>min</span>
                <button style={timeBtnStyle} onClick={handleAdd}>Add</button>
              </div>
            )}
            {ms > 0 && <MenuItem icon="✎" label="Edit tracked time" onAction={() => { setExpandedTime(prev => prev === 'edit' ? null : 'edit'); setEditVal('') }} />}
            {ms > 0 && expandedTime === 'edit' && (
              <div style={timeRowStyle} onMouseDown={e => e.stopPropagation()}>
                <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} style={timeInputStyle} onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setExpandedTime(null) }} />
                <span style={timeHintStyle}>min</span>
                <button style={timeBtnStyle} onClick={handleEdit}>Save</button>
              </div>
            )}
          </div>
          {ms > 0 && menuDivider}
          {ms > 0 && (
            <div style={{ padding: '4px 0' }}>
              <MenuItem icon="↑" label="Send to Jira" />
            </div>
          )}
          {menuDivider}
          <div style={{ padding: '4px 0' }}>
            <MenuItem icon="★" label="Add to favourites" />
            <MenuItem icon="⧉" label="Duplicate as new task" />
          </div>
          {menuDivider}
          <div style={{ padding: '4px 0' }}>
            <MenuItem icon="✕" label="Delete task" color="rgba(220,100,100,0.88)" onAction={onDelete} />
          </div>
        </div>
      )}
    </div>
  )
}

export function HistoryView() {
  const { entries, deleteEntry, updateEntry } = useEntries()
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, { ts: number; entries: TimeEntry[] }>()
    for (const e of entries) {
      const key = getDayKey(e.ts)
      if (!map.has(key)) map.set(key, { ts: e.ts, entries: [] })
      map.get(key)!.entries.push(e)
    }
    for (const group of map.values()) {
      group.entries.sort((a, b) => b.ts - a.ts)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].ts - a[1].ts)
  }, [entries])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {grouped.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, padding: '28px 16px', textAlign: 'center' }}>
          No entries yet
        </div>
      )}
      {grouped.map(([key, { ts, entries: dayEntries }]) => {
        const totalMs = dayEntries.reduce((sum, e) => sum + e.ms, 0)
        const hasUnsent = dayEntries.some(e => !e.jiraSent && !!e.jiraKey)
        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'linear-gradient(145deg, #1e1850 0%, #0e1830 100%)', zIndex: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                {getDayLabel(ts)}
              </span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {hasUnsent && (
                  <button style={{ fontSize: 9, padding: '3px 7px', borderRadius: 99, background: 'rgba(80,180,100,0.28)', border: '1px solid rgba(80,180,100,0.45)', color: '#7fd89a', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    ↑ Jira
                  </button>
                )}
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                  {formatMsShort(totalMs)}
                </span>
              </div>
            </div>

            {dayEntries.map((entry) => (
              <div key={entry.id} style={{ padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </span>
                    {entry.jiraSent && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(80,180,100,0.2)', border: '1px solid rgba(80,180,100,0.35)', color: '#7fd89a', flexShrink: 0 }}>
                        ✓ sent
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMs(entry.ms)}
                  </span>
                  <EntryMenu
                    ms={entry.ms}
                    open={openMenuId === entry.id}
                    onOpen={() => setOpenMenuId(prev => prev === entry.id ? null : entry.id)}
                    onClose={() => setOpenMenuId(null)}
                    onDelete={async () => { await deleteEntry(entry.id) }}
                    onAddTime={async (added) => { await updateEntry({ ...entry, ms: entry.ms + added, updatedAt: new Date().toISOString() }) }}
                    onEditTime={async (newMs) => { await updateEntry({ ...entry, ms: newMs, updatedAt: new Date().toISOString() }) }}
                  />
                </div>

                {entry.jiraDesc && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.jiraDesc}
                  </div>
                )}

                {(entry.clientName || entry.jiraKey) && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {entry.clientName && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.32)' }}>
                        {entry.clientName}
                      </span>
                    )}
                    {entry.jiraKey && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>
                        {entry.jiraKey}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
