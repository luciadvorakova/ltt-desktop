import { useState, useMemo, useEffect } from 'react'
import { useEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { getClientColor } from '../lib/clientColors'
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
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 13px', fontSize: 11, color: color ?? 'var(--text-primary)', cursor: 'pointer', background: hovered ? 'var(--bg-btn-subtle)' : 'none', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onAction}
    >
      <span style={{ fontSize: 12, color: color ? color : 'var(--text-muted)', width: 16, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}

function EntryMenu({ open, onOpen, onClose }: {
  open: boolean; onOpen: () => void; onClose: () => void;
}) {
  return (
    <button
      style={{ background: 'none', border: 'none', padding: 0, paddingBottom: 1, margin: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, lineHeight: 1, flexShrink: 0, letterSpacing: 1 }}
      onMouseDown={(e) => { e.stopPropagation(); open ? onClose() : onOpen() }}
    >
      •••
    </button>
  )
}

function HistoryBottomSheet({ open, onClose, onDelete, onAddTime, onEditTime, ms }: {
  open: boolean; onClose: () => void;
  onDelete: () => void;
  onAddTime: (ms: number) => void; onEditTime: (ms: number) => void;
  ms: number;
}) {
  const [expandedTime, setExpandedTime] = useState<'add' | 'edit' | null>(null)
  const [addVal, setAddVal] = useState('')
  const [editVal, setEditVal] = useState('')

  useEffect(() => { if (!open) { setExpandedTime(null); setAddVal(''); setEditVal('') } }, [open])

  if (!open) return null

  const timeInputStyle: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, fontFamily: 'inherit', padding: '3px 7px', width: 52, textAlign: 'center', outline: 'none' }
  const timeBtnStyle: React.CSSProperties = { fontSize: 9, padding: '4px 10px', borderRadius: 99, background: 'var(--bg-btn-subtle)', border: '1px solid var(--border-btn)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }

  const handleAdd = () => { const p = parseMin(addVal); if (p !== null) { onAddTime(p); onClose() } }
  const handleEdit = () => { const p = parseMin(editVal); if (p !== null) { onEditTime(p); onClose() } }

  return (
    <>
      <div
        onMouseDown={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, borderRadius: 20, cursor: 'pointer' }}
      />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '68%', overflowY: 'auto', background: 'var(--bg-overlay)', border: '1px solid var(--border-card)', borderRadius: '16px 16px 0 0', zIndex: 101, scrollbarWidth: 'none' }}
      >
        <div style={{ padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <MenuItem icon="⏱" label="Add time manually" onAction={() => setExpandedTime(expandedTime === 'add' ? null : 'add')} />
          {expandedTime === 'add' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 13px 7px 38px' }}>
              <input style={timeInputStyle} placeholder="60" value={addVal} onChange={e => setAddVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>min</span>
              <button style={timeBtnStyle} onClick={handleAdd}>Add</button>
            </div>
          )}
          <MenuItem icon="✎" label="Edit tracked time" onAction={() => setExpandedTime(expandedTime === 'edit' ? null : 'edit')} />
          {expandedTime === 'edit' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 13px 7px 38px' }}>
              <input style={timeInputStyle} placeholder={String(Math.round(ms / 60000))} value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEdit()} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>min</span>
              <button style={timeBtnStyle} onClick={handleEdit}>Save</button>
            </div>
          )}
        </div>
        <div style={{ padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <MenuItem icon="✕" label="Delete task" color="rgba(220,100,100,0.88)" onAction={() => { onDelete(); onClose() }} />
        </div>
        <div
          onMouseDown={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          Cancel
        </div>
      </div>
    </>
  )
}

export function HistoryView() {
  const { entries, deleteEntry, updateEntry } = useEntries()
  const { settings } = useSettings(entries)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const theme = (document.documentElement.getAttribute('data-theme') ?? 'dark') as 'dark' | 'light'

  const grouped = useMemo(() => {
    const map = new Map<string, { ts: number; entries: TimeEntry[] }>()
    for (const e of entries) {
      if (e.ms < 1000) continue
      const key = getDayKey(e.ts)
      if (!map.has(key)) map.set(key, { ts: e.ts, entries: [] })
      map.get(key)!.entries.push(e)
    }
    for (const group of map.values()) {
      group.entries.sort((a, b) => b.ts - a.ts)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].ts - a[1].ts)
  }, [entries])

  const menuEntry = openMenuId !== null ? entries.find(e => e.id === openMenuId) ?? null : null

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {grouped.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '28px 16px', textAlign: 'center' }}>
            No entries yet
          </div>
        )}
        {grouped.map(([key, { ts, entries: dayEntries }]) => {
          const totalMs = dayEntries.reduce((sum, e) => sum + e.ms, 0)
          const hasUnsent = dayEntries.some(e => !e.jiraSent && !!e.jiraKey)
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 6px', borderBottom: '1px solid var(--border-entry)', position: 'sticky', top: 0, background: 'var(--bg-card-solid)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {getDayLabel(ts)}
                </span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {hasUnsent && (
                    <button style={{ fontSize: 9, padding: '3px 7px', borderRadius: 99, background: 'var(--accent-jira-bg)', border: '1px solid var(--accent-jira-border)', color: 'var(--accent-jira-text)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                      ↑ Jira
                    </button>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {formatMsShort(totalMs)}
                  </span>
                </div>
              </div>

              {dayEntries.map((entry) => {
                const clientColor = getClientColor(entry.clientName, settings?.clientColors ?? undefined, theme)
                return (
                  <div key={entry.id} style={{ padding: '7px 14px', borderTop: '1px solid var(--border-entry)' }}>
                    {(entry.clientName || entry.jiraKey) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        {entry.clientName && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, ...(clientColor ? { background: clientColor.bg, border: `1px solid ${clientColor.border}`, color: clientColor.text } : { background: 'var(--bg-btn-subtle)', border: '1px solid var(--border-entry)', color: 'var(--text-secondary)' }) }}>
                            {entry.clientName}
                          </span>
                        )}
                        {entry.jiraKey && (
                          <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text-muted)' }}>
                            {entry.jiraKey}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {entry.name}
                      </span>
                      {entry.jiraSent && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--accent-jira-bg)', border: '1px solid var(--accent-jira-border)', color: 'var(--accent-jira-text)', flexShrink: 0 }}>
                          ✓ sent
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {formatMs(entry.ms)}
                      </span>
                      <EntryMenu
                        open={openMenuId === entry.id}
                        onOpen={() => setOpenMenuId(entry.id)}
                        onClose={() => setOpenMenuId(null)}
                      />
                    </div>

                    {entry.jiraDesc && (
                      <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.jiraDesc}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <HistoryBottomSheet
        open={openMenuId !== null}
        onClose={() => setOpenMenuId(null)}
        ms={menuEntry?.ms ?? 0}
        onDelete={async () => { if (menuEntry) await deleteEntry(menuEntry.id) }}
        onAddTime={async (added) => { if (menuEntry) await updateEntry({ ...menuEntry, ms: menuEntry.ms + added, updatedAt: new Date().toISOString() }) }}
        onEditTime={async (newMs) => { if (menuEntry) await updateEntry({ ...menuEntry, ms: newMs, updatedAt: new Date().toISOString() }) }}
      />
    </div>
  )
}
