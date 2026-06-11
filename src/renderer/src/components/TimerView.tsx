import { useState, useEffect, useRef, useMemo } from 'react'
import { useEntries } from '../hooks/useEntries'
import { useTimer } from '../hooks/useTimer'
import { useSettings } from '../hooks/useSettings'
import { useLtt } from '../hooks/useLtt'
import { BulkSendView } from './BulkSendView'
import { StandupView } from './StandupView'
import { getClientColor } from '../lib/clientColors'
import type { TimeEntry } from '../../../types/index'

function MenuItem({ icon, label, color, onAction }: { icon: string; label: string; color?: string; onAction?: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 13px',
        fontSize: 11,
        color: color ?? 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.07)' : 'none',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onAction}
    >
      <span style={{ fontSize: 12, color: color ? color : 'rgba(255,255,255,0.3)', width: 16, textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

const menuDivider = <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />


function parseMin(input: string): number | null {
  const n = parseInt(input.trim(), 10)
  if (isNaN(n) || n < 0) return null
  return n * 60000
}


function EntryMenu({ ms, open, onOpen, onClose, onDelete, onEditDesc, onAddTime, onEditTime, onAddToFavourites, onSendToJira, onLinkToJira, onChangeJiraLink, onRemoveFromTimer, onDuplicate, onMoveTo, currentTab }: {
  ms: number; open: boolean; onOpen: () => void; onClose: () => void;
  onDelete: () => void; onEditDesc: () => void;
  onAddTime: (ms: number) => void; onEditTime: (ms: number) => void;
  onAddToFavourites?: () => void;
  onSendToJira?: () => void;
  onLinkToJira?: () => void;
  onChangeJiraLink?: () => void;
  onRemoveFromTimer?: () => void;
  onDuplicate?: () => void;
  onMoveTo?: (tab: 'today' | 'tomorrow' | 'later') => void;
  currentTab?: 'today' | 'tomorrow' | 'later';
}) {
  const [above, setAbove] = useState(false)
  const [expandedTime, setExpandedTime] = useState<'add' | 'edit' | null>(null)
  const [addVal, setAddVal] = useState('')
  const [editVal, setEditVal] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) setExpandedTime(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    document.addEventListener('mousedown', onClose)
    return () => document.removeEventListener('mousedown', onClose)
  }, [open, onClose])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setAbove(spaceBelow < 280 && spaceAbove > spaceBelow)
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
          style={{
            position: 'absolute',
            right: 0,
            ...(above ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
            background: 'linear-gradient(145deg, #1e1850, #0e1830)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12,
            minWidth: 180,
            boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {onMoveTo && (
            <>
              <div style={{ padding: '4px 0' }}>
                {currentTab !== 'today' && <MenuItem icon="←" label="Move to Today" onAction={() => { onMoveTo('today'); onClose() }} />}
                {currentTab !== 'tomorrow' && <MenuItem icon="→" label="Move to Tomorrow" onAction={() => { onMoveTo('tomorrow'); onClose() }} />}
                {currentTab !== 'later' && <MenuItem icon="→" label="Move to Later" onAction={() => { onMoveTo('later'); onClose() }} />}
              </div>
              {menuDivider}
            </>
          )}
          {currentTab === 'today' && (
            <div style={{ padding: '4px 0' }}>
              <MenuItem icon="⏱" label="Add time manually" onAction={() => { setAddVal(''); setExpandedTime(prev => prev === 'add' ? null : 'add') }} />
              {expandedTime === 'add' && (
                <div style={timeRowStyle} onMouseDown={e => e.stopPropagation()}>
                  <input autoFocus value={addVal} onChange={e => setAddVal(e.target.value)} style={timeInputStyle}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setExpandedTime(null) }} />
                  <span style={timeHintStyle}>min</span>
                  <button style={timeBtnStyle} onMouseDown={handleAdd}>Add</button>
                </div>
              )}
              {ms > 0 && <MenuItem icon="✎" label="Edit tracked time" onAction={() => { setExpandedTime(prev => prev === 'edit' ? null : 'edit'); setEditVal('') }} />}
              {ms > 0 && expandedTime === 'edit' && (
                <div style={timeRowStyle} onMouseDown={e => e.stopPropagation()}>
                  <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} style={timeInputStyle}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setExpandedTime(null) }} />
                  <span style={timeHintStyle}>min</span>
                  <button style={timeBtnStyle} onMouseDown={handleEdit}>Save</button>
                </div>
              )}
            </div>
          )}
          {currentTab === 'today' && ms > 0 && onSendToJira && menuDivider}
          {currentTab === 'today' && ms > 0 && onSendToJira && (
            <div style={{ padding: '4px 0' }}>
              <MenuItem icon="↑" label="Send to Jira" onAction={() => { onSendToJira(); onClose() }} />
            </div>
          )}
          {menuDivider}
          <div style={{ padding: '4px 0' }}>
            {onLinkToJira && <MenuItem icon="⛓" label="Link to Jira" onAction={() => { onLinkToJira(); onClose() }} />}
            {onChangeJiraLink && <MenuItem icon="⛓" label="Change Jira link" onAction={() => { onChangeJiraLink(); onClose() }} />}
            <MenuItem icon="✏" label="Edit description" onAction={() => { onClose(); onEditDesc() }} />
            <MenuItem icon="★" label="Add to favourites" onAction={onAddToFavourites ? () => { onAddToFavourites(); onClose() } : undefined} />
            <MenuItem icon="⧉" label="Duplicate as new task" onAction={onDuplicate ? () => { onDuplicate(); onClose() } : undefined} />
            {currentTab === 'today' && <MenuItem icon="✕" label="Remove from timer" color="rgba(255,255,255,0.5)" onAction={onRemoveFromTimer ? () => { onRemoveFromTimer(); onClose() } : undefined} />}
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

function JiraRow({ icon, jiraKey, name, onClick, onUnfav, onFav }: { icon: string; jiraKey: string; name: string; onClick: () => void; onUnfav?: () => void; onFav?: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {icon && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{icon}</span>}
      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
        {jiraKey}
      </span>
      <span style={{ fontSize: 11, flex: 1, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      {onUnfav && (
        <button
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 11, padding: '0 2px', flexShrink: 0, lineHeight: 1, fontFamily: 'inherit' }}
          onClick={e => { e.stopPropagation(); onUnfav() }}
        >
          ★
        </button>
      )}
      {onFav && (
        <button
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, padding: '0 2px', flexShrink: 0, lineHeight: 1, fontFamily: 'inherit' }}
          onClick={e => { e.stopPropagation(); onFav() }}
        >
          ☆
        </button>
      )}
    </div>
  )
}

function RecentRow({ entry, selected, onToggle, clientColors }: { entry: TimeEntry; selected: boolean; onToggle: () => void; clientColors?: Record<string, number> }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggle}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
        border: selected ? '1.5px solid rgba(80,180,100,0.6)' : '1.5px solid rgba(255,255,255,0.25)',
        background: selected ? 'rgba(80,180,100,0.3)' : 'rgba(255,255,255,0.06)',
        color: '#7fd89a',
      }}>
        {selected ? '✓' : ''}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {(entry.clientName || entry.jiraKey) && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {entry.clientName && (() => {
              const color = getClientColor(entry.clientName, clientColors)
              return (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                  background: color ? color.bg : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${color ? color.border : 'rgba(255,255,255,0.09)'}`,
                  color: color ? color.text : 'rgba(255,255,255,0.32)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {entry.clientName}
                </span>
              )
            })()}
            {entry.jiraKey && (
              <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                {entry.jiraKey}
              </span>
            )}
          </div>
        )}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {entry.name}
        </span>
        {entry.jiraDesc && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.jiraDesc}
          </div>
        )}
      </div>
    </div>
  )
}

const formatMs = (ms: number): string => {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}


const formatMsHHMM = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function TimerView({ standupOpen: standupOpenProp, onStandupClose }: { standupOpen?: boolean; onStandupClose?: () => void } = {}) {
  const ltt = useLtt()
  const { entries, patchEntry, deleteEntry, addEntry, updateEntry } = useEntries()
  const { timerState, elapsed, start, pause } = useTimer({ patchEntry })
  const { settings, updateSetting } = useSettings(entries)
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [standupOpenInternal, setStandupOpenInternal] = useState(false)
  const standupOpen = standupOpenProp === true ? true : standupOpenInternal
  const setStandupOpen = (v: boolean) => { setStandupOpenInternal(v); if (!v) onStandupClose?.() }
  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [addMode, setAddMode] = useState<'jira' | 'manual' | 'recent'>('jira')
  const [manualInput, setManualInput] = useState('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [editingDescId, setEditingDescId] = useState<number | null>(null)
  const [localDesc, setLocalDesc] = useState('')
  const [linkJiraEntryId, setLinkJiraEntryId] = useState<number | null>(null)
  const [jiraQuery, setJiraQuery] = useState('')
  const [jiraResults, setJiraResults] = useState<{ key: string; summary: string }[]>([])
  const [jiraSearching, setJiraSearching] = useState(false)
  const jiraDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const escapeRef = useRef(false)
  const jiraProjectsRef = useRef<Map<string, string>>(new Map())
  const dragIdRef = useRef<number | null>(null)
  const dragOverIdRef = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [dragOrderedEntries, setDragOrderedEntries] = useState<TimeEntry[] | null>(null)
  const [selectedRecent, setSelectedRecent] = useState<Set<string>>(new Set())
  const [activeSubTab, setActiveSubTab] = useState<'today' | 'tomorrow' | 'later'>('today')
  const [dragOverTab, setDragOverTab] = useState<'today' | 'tomorrow' | 'later' | null>(null)
  const dragTabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const needsProjects = (addPanelOpen && addMode === 'jira') || linkJiraEntryId !== null
    if (needsProjects && jiraProjectsRef.current.size === 0) {
      ltt.jiraGetProjects().then(projects => {
        const map = new Map<string, string>()
        for (const p of projects) map.set(p.key, p.name)
        jiraProjectsRef.current = map
      })
    }
  }, [addPanelOpen, addMode, linkJiraEntryId, ltt])

  const handleAddEntry = async () => {
    const name = manualInput.trim()
    if (!name) return
    const entry: TimeEntry = {
      id: Math.floor(Date.now()),
      name,
      ms: 0,
      ts: Date.now(),
      jiraSent: false,
      untracked: false,
      carriedOver: false,
      removedFromTimer: false,
      deletedFromBulk: false,
      updatedAt: new Date().toISOString(),
      tab: activeSubTab,
    }
    await addEntry(entry)
    setManualInput('')
    setAddPanelOpen(false)
  }

  const handleStart = async (id: number) => {
    const prevSaved = await start(id)
    if (prevSaved) patchEntry(prevSaved.id, prevSaved.ms)
  }
  const handlePause = async () => {
    await pause()
  }

  const handleStartRef = useRef(handleStart)
  useEffect(() => { handleStartRef.current = handleStart })
  useEffect(() => {
    const handler = (...args: unknown[]) => {
      handleStartRef.current(parseInt(args[0] as string, 10))
    }
    ltt.on('start-tracking-from-notification', handler)
    return () => ltt.off('start-tracking-from-notification', handler)
  }, [ltt])
  const modifyFavourites = async (fn: (current: NonNullable<typeof settings>['jiraFavourites']) => NonNullable<typeof settings>['jiraFavourites'], label?: string) => {
    console.log('[FAV] called, label:', label)
    const latest = await ltt.getSettings()
    const current = latest?.jiraFavourites ?? []
    const next = fn(current)
    console.log('[FAV] new array:', JSON.stringify(next))
    updateSetting('jiraFavourites', next)
    await ltt.setSettings({ ...(latest ?? {}), jiraFavourites: next })
    const session = await ltt.getSession()
    if (session) {
      const userId = JSON.parse(atob(session.access_token.split('.')[1])).sub as string
      await ltt.pushSettings(userId)
    }
  }

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEntries = entries.filter(e => {
    if (e.removedFromTimer) return false
    if (!(e.tab === 'today' || !e.tab)) return false
    if (e.jiraSent) {
      if (settings?.manualTimerCleanup) return true
      return e.ts >= todayStart.getTime()
    }
    return true
  })

  console.log('[TODAY] entry ids:', todayEntries.map(e => e.id))

  const tomorrowEntries = entries.filter(e =>
    !e.removedFromTimer && !e.deletedFromBulk && e.tab === 'tomorrow'
  )
  const laterEntries = entries.filter(e =>
    !e.removedFromTimer && !e.deletedFromBulk && e.tab === 'later'
  )

  const orderedEntries = useMemo(() => {
    const source = activeSubTab === 'today' ? todayEntries : activeSubTab === 'tomorrow' ? tomorrowEntries : laterEntries
    return [...source].sort((a, b) => {
      if (activeSubTab === 'today') {
        if (!a.jiraSent && b.jiraSent) return -1
        if (a.jiraSent && !b.jiraSent) return 1
      }
      const aOrder = a.sortOrder ?? Infinity
      const bOrder = b.sortOrder ?? Infinity
      if (aOrder !== bOrder) return aOrder - bOrder
      return b.ts - a.ts
    })
  }, [todayEntries, tomorrowEntries, laterEntries, activeSubTab])

  const reorderEntries = async (fromId: number | null, toId: number) => {
    if (fromId === null || fromId === toId) return
    const draggedEntry = entries.find(e => e.id === fromId)
    if (draggedEntry && (draggedEntry.tab ?? 'today') !== activeSubTab) return
    const base = dragOrderedEntries ?? orderedEntries
    const from = base.findIndex(e => e.id === fromId)
    const to = base.findIndex(e => e.id === toId)
    if (from === -1 || to === -1) return

    const next = [...base]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDragOrderedEntries(next)

    // Compute midpoint sortOrder for the moved entry only
    const idx = next.indexOf(moved)
    const above = next[idx - 1]
    const below = next[idx + 1]
    let newSortOrder: number
    if (!above) {
      newSortOrder = (below?.sortOrder ?? 0) - 1000
    } else if (!below) {
      newSortOrder = (above?.sortOrder ?? 0) + 1000
    } else {
      newSortOrder = ((above.sortOrder ?? 0) + (below.sortOrder ?? 0)) / 2
    }

    await updateEntry({ ...moved, sortOrder: newSortOrder, updatedAt: new Date().toISOString() })
    setDragOrderedEntries(null)
  }

  const activeId = timerState?.activeEntryId ?? null
  const isRunning = timerState?.running ?? false
  const liveMs = timerState
    ? (timerState.running ? timerState.baseMs + elapsed : timerState.baseMs)
    : 0

  const totalMs = todayEntries.reduce((sum, e) => sum + e.ms, 0) + (isRunning ? elapsed : 0)

  if (bulkSendOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <BulkSendView entries={entries.filter(e => !e.tab || e.tab === 'today')} updateEntry={updateEntry} onBack={() => setBulkSendOpen(false)} />
      </div>
    )
  }

  if (standupOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <StandupView entries={entries.filter(e => !e.tab || e.tab === 'today')} onBack={() => setStandupOpen(false)} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`.desc-field::placeholder { color: rgba(255,255,255,0.2); }`}</style>

      {/* Sub-tab bar + add button */}
      {!addPanelOpen && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex' }}>
            {(['today', 'tomorrow', 'later'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveSubTab(tab); setAddPanelOpen(false) }}
                onDragOver={e => {
                  e.preventDefault()
                  setDragOverTab(tab)
                  if (dragTabTimerRef.current) clearTimeout(dragTabTimerRef.current)
                  dragTabTimerRef.current = setTimeout(() => { setActiveSubTab(tab) }, 600)
                }}
                onDragLeave={() => {
                  if (dragTabTimerRef.current) clearTimeout(dragTabTimerRef.current)
                  setDragOverTab(null)
                }}
                onDrop={async () => {
                  if (dragTabTimerRef.current) clearTimeout(dragTabTimerRef.current)
                  setDragOverTab(null)
                  const draggedId = dragIdRef.current
                  if (draggedId === null) return
                  const draggedEntry = entries.find(e => e.id === draggedId)
                  if (!draggedEntry || (draggedEntry.tab ?? 'today') === tab) return
                  await updateEntry({ ...draggedEntry, tab, updatedAt: new Date().toISOString() })
                }}
                style={{
                  fontSize: 10,
                  padding: '11px 14px',
                  marginBottom: -1,
                  background: dragOverTab === tab ? 'rgba(255,255,255,0.08)' : 'none',
                  borderRadius: dragOverTab === tab ? 6 : 0,
                  border: 'none',
                  borderBottom: activeSubTab === tab ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                  color: activeSubTab === tab ? 'white' : 'rgba(255,255,255,0.35)',
                  fontWeight: activeSubTab === tab ? 600 : 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {tab === 'today' ? 'Today' : tab === 'tomorrow' ? 'Tomorrow' : 'Later'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddPanelOpen(true)}
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 15, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0 }}
          >
            +
          </button>
        </div>
      )}
      {/* Add panel */}
      {addPanelOpen && (
        <div className="ltt-panel-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <style>{`.ltt-panel-scroll::-webkit-scrollbar { display: none; } .ltt-panel-scroll { scrollbar-width: none; } .ltt-jira-search::placeholder { color: rgba(255,255,255,0.3); } .ltt-manual-input::placeholder { color: rgba(255,255,255,0.28); }`}</style>

          {/* Mode tabs + close button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <div style={{ display: 'flex', paddingLeft: 14 }}>
              {(['jira', 'manual', 'recent'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setAddMode(mode); setSelectedRecent(new Set()) }}
                  style={{
                    fontSize: 10,
                    padding: '11px 12px',
                    marginBottom: -1,
                    background: 'none',
                    border: 'none',
                    borderBottom: addMode === mode ? '2px solid rgba(255,255,255,0.55)' : '2px solid transparent',
                    color: addMode === mode ? 'white' : 'rgba(255,255,255,0.35)',
                    fontWeight: addMode === mode ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {mode === 'jira' ? 'Jira task' : mode === 'manual' ? 'Manual' : 'Recent'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setAddPanelOpen(false); setSelectedRecent(new Set()) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, padding: '0 14px', lineHeight: 1, fontFamily: 'inherit' }}
            >
              ×
            </button>
          </div>

          {/* Jira mode */}
          {addMode === 'jira' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ padding: '10px 14px 8px', flexShrink: 0 }}>
                <input
                  autoFocus
                  placeholder="Search Jira issues…"
                  value={jiraQuery}
                  onChange={e => {
                    const q = e.target.value
                    setJiraQuery(q)
                    if (jiraDebounceRef.current) clearTimeout(jiraDebounceRef.current)
                    if (!q.trim()) { setJiraResults([]); setJiraSearching(false); return }
                    setJiraSearching(true)
                    jiraDebounceRef.current = setTimeout(async () => {
                      const results = await ltt.jiraSearch(q)
                      setJiraResults(results)
                      setJiraSearching(false)
                    }, 300)
                  }}
                  className="ltt-jira-search"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 99, padding: '7px 12px', fontSize: 11, color: 'rgba(255,255,255,0.85)', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              {jiraSearching && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', padding: '2px 14px 8px', textAlign: 'center' }}>
                  Searching…
                </div>
              )}
              {!jiraSearching && jiraQuery.trim() && jiraResults.length === 0 && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', padding: '2px 14px 8px', textAlign: 'center' }}>
                  No results
                </div>
              )}
              {!jiraSearching && jiraResults.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {jiraResults.map(issue => {
                    const favs = settings?.jiraFavourites ?? []
                    const isFav = favs.some(f => f.jiraKey === issue.key)
                    return (
                    <JiraRow
                      key={issue.key}
                      icon="◈"
                      jiraKey={issue.key}
                      name={issue.summary}
                      onClick={async () => {
                        const projectKey = issue.key.split('-')[0]
                        const clientName = jiraProjectsRef.current.get(projectKey)
                        const entry: TimeEntry = {
                          id: Math.floor(Date.now()),
                          name: issue.summary,
                          ms: 0,
                          ts: Date.now(),
                          jiraKey: issue.key,
                          jiraSummary: issue.summary,
                          clientName,
                          jiraSent: false,
                          untracked: false,
                          carriedOver: false,
                          removedFromTimer: false,
                          deletedFromBulk: false,
                          updatedAt: new Date().toISOString(),
                          tab: activeSubTab,
                        }
                        await addEntry(entry)
                        setJiraQuery('')
                        setJiraResults([])
                        setAddPanelOpen(false)
                        ltt.jiraGetClientName(issue.key).then(name => {
                          if (name) { patchEntry(entry.id, undefined, name); updateEntry({ ...entry, clientName: name, updatedAt: new Date().toISOString() }) }
                        })
                      }}
                      onUnfav={isFav ? () => modifyFavourites(cur => (cur ?? []).filter(f => f.jiraKey !== issue.key), `remove:${issue.key}`) : undefined}
                      onFav={!isFav ? () => modifyFavourites(cur => [{ jiraKey: issue.key, jiraSummary: issue.summary, clientName: jiraProjectsRef.current.get(issue.key.split('-')[0]) }, ...(cur ?? [])] as NonNullable<typeof settings>['jiraFavourites'], `add:${issue.key}`) : undefined}
                    />
                    )
                  })}
                </div>
              )}
              {!jiraQuery.trim() && (() => {
                const favKeys = (settings?.jiraFavourites ?? []).filter(f => !!f?.jiraKey)
                const seenRecent = new Set<string>()
                const recentEntries = [...entries]
                  .filter(e => !!e.jiraKey)
                  .sort((a, b) => b.ts - a.ts)
                  .filter(e => { if (seenRecent.has(e.jiraKey!)) return false; seenRecent.add(e.jiraKey!); return true })
                  .slice(0, 30)
                const makeEntry = (jiraKey: string, name: string, jiraSummary: string | undefined, clientName: string | undefined): TimeEntry => ({
                  id: Math.floor(Date.now()),
                  name,
                  ms: 0,
                  ts: Date.now(),
                  jiraKey,
                  jiraSummary,
                  clientName,
                  jiraSent: false,
                  untracked: false,
                  carriedOver: false,
                  removedFromTimer: false,
                  deletedFromBulk: false,
                  updatedAt: new Date().toISOString(),
                  tab: activeSubTab,
                })
                return (
                  <>
                    {favKeys.length > 0 && (
                      <div style={{ padding: '8px 0 0' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', padding: '0 14px 5px' }}>
                          ★ Favourites
                        </div>
                        {favKeys.map(fav => (
                          <JiraRow
                            key={fav.jiraKey}
                            icon=""
                            jiraKey={fav.jiraKey}
                            name={fav.jiraSummary ?? fav.jiraKey}
                            onClick={async () => {
                              await addEntry(makeEntry(fav.jiraKey, fav.jiraSummary ?? fav.jiraKey, fav.jiraSummary, fav.clientName))
                              setAddPanelOpen(false)
                            }}
                            onUnfav={() => modifyFavourites(cur => (cur ?? []).filter(f => f.jiraKey !== fav.jiraKey), `remove-fav:${fav.jiraKey}`)}
                          />
                        ))}
                      </div>
                    )}
                    {recentEntries.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', padding: '0 14px 5px', marginTop: 8 }}>
                          ◷ Recent
                        </div>
                        {recentEntries.map(e => (
                          <JiraRow
                            key={e.jiraKey}
                            icon=""
                            jiraKey={e.jiraKey!}
                            name={e.jiraSummary ?? e.name}
                            onClick={async () => {
                              await addEntry(makeEntry(e.jiraKey!, e.jiraSummary ?? e.name, e.jiraSummary, e.clientName))
                              setAddPanelOpen(false)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Manual mode */}
          {addMode === 'manual' && (
            <div style={{ display: 'flex', gap: 6, padding: '10px 14px 8px' }}>
              <input
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddEntry() }}
                placeholder="Task name…"
                className="ltt-manual-input"
                style={{ flex: 1, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 99, padding: '7px 12px', fontSize: 11, color: 'white', outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={handleAddEntry}
                style={{ fontSize: 10, padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Add
              </button>
            </div>
          )}

          {/* Recent mode */}
          {addMode === 'recent' && (() => {
            const seen = new Set<string>()
            const recent = [...entries]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .filter(e => {
                const key = `${e.name}||${e.jiraDesc ?? ''}`
                if (seen.has(key)) return false
                seen.add(key)
                return true
              })
              .slice(0, 30)
            const handleAddSelected = async () => {
              const toAdd = recent.filter(e => selectedRecent.has(`${e.name}||${e.jiraDesc ?? ''}`))
              for (const e of toAdd) {
                await addEntry({
                  id: Math.floor(Date.now()),
                  name: e.name,
                  ms: 0,
                  ts: Date.now(),
                  jiraKey: e.jiraKey,
                  jiraSummary: e.jiraSummary,
                  jiraDesc: e.jiraDesc,
                  clientName: e.clientName,
                  jiraSent: false,
                  untracked: false,
                  carriedOver: false,
                  removedFromTimer: false,
                  deletedFromBulk: false,
                  updatedAt: new Date().toISOString(),
                  tab: activeSubTab,
                })
              }
              setSelectedRecent(new Set())
              setAddPanelOpen(false)
            }
            return recent.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>
                No recent entries
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div>
                  {recent.map(e => {
                    const key = `${e.name}||${e.jiraDesc ?? ''}`
                    return (
                      <RecentRow
                        key={`${key}||${e.id}`}
                        entry={e}
                        selected={selectedRecent.has(key)}
                        clientColors={settings?.clientColors}
                        onToggle={() => setSelectedRecent(prev => {
                          const next = new Set(prev)
                          next.has(key) ? next.delete(key) : next.add(key)
                          return next
                        })}
                      />
                    )
                  })}
                </div>
                {selectedRecent.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(145deg, #1e1850, #0e1830)', position: 'sticky', bottom: 0, flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
                      {selectedRecent.size} selected
                    </span>
                    <button
                      onClick={handleAddSelected}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 99, background: 'rgba(80,180,100,0.22)', border: '1px solid rgba(80,180,100,0.45)', color: '#7fd89a', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: 'auto', display: addPanelOpen ? 'none' : 'flex', flexDirection: 'column', paddingTop: 4 }}>
        {orderedEntries.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, padding: '28px 16px', textAlign: 'center' }}>
            {activeSubTab === 'today' ? 'No entries today' : activeSubTab === 'tomorrow' ? 'No tasks for tomorrow yet.' : 'No backlog tasks yet. Add tasks you want to work on later.'}
          </div>
        )}
        {(dragOrderedEntries ?? orderedEntries).map((entry) => {
          const isActive = activeId === entry.id
          const isActiveRunning = isActive && isRunning
          const displayMs = isActiveRunning ? liveMs : entry.ms

          if (isActive) console.log('[DISPLAY] entry id:', entry.id, 'isActive:', isActive, 'isRunning:', isRunning, 'displayMs:', displayMs, 'entry.ms:', entry.ms, 'liveMs:', liveMs, 'baseMs:', timerState?.baseMs, 'elapsed:', elapsed)

          return (
            <div
              key={entry.id}
              draggable={true}
              onDragStart={() => { dragIdRef.current = entry.id }}
              onDragOver={e => { e.preventDefault(); dragOverIdRef.current = entry.id; setDragOverId(entry.id) }}
              onDragEnd={() => { setDragOverId(null); dragIdRef.current = null; dragOverIdRef.current = null }}
              onDrop={() => { reorderEntries(dragIdRef.current, entry.id); setDragOverTab(null) }}
              style={{
                padding: '8px 14px',
                borderTop: dragOverId === entry.id ? '2px solid rgba(100,160,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                background: activeSubTab === 'today' && isActiveRunning ? 'rgba(80,180,100,0.07)' : 'transparent',
                opacity: entry.jiraSent ? 0.5 : 1,
                cursor: 'grab',
              }}
            >
              {/* 2-column layout */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>

                {/* Left column: play button + entry body */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, flex: 1, minWidth: 0 }}>

                  {/* Play button (today only) */}
                  {activeSubTab === 'today' && (
                    <button
                      draggable={false}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={entry.jiraSent ? undefined : () => isActiveRunning ? handlePause() : handleStart(entry.id)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: entry.jiraSent ? 'rgba(80,180,100,0.15)' : isActiveRunning ? 'rgba(80,180,100,0.3)' : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${entry.jiraSent ? 'rgba(80,180,100,0.3)' : isActiveRunning ? 'rgba(80,180,100,0.6)' : 'rgba(255,255,255,0.18)'}`,
                        color: entry.jiraSent ? '#7fd89a' : isActiveRunning ? '#7fd89a' : 'rgba(255,255,255,0.6)',
                        cursor: entry.jiraSent ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 8,
                        padding: 0,
                        marginTop: 2,
                      }}
                    >
                      {entry.jiraSent ? '✓' : isActiveRunning ? '⏸' : '▶'}
                    </button>
                  )}

                  {/* Entry body */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Badges row */}
                    {(entry.clientName || entry.jiraKey) && (
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {entry.clientName && (() => {
                          const color = getClientColor(entry.clientName, settings?.clientColors)
                          return (
                            <span draggable={false} style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 99,
                              background: color ? color.bg : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${color ? color.border : 'rgba(255,255,255,0.09)'}`,
                              color: color ? color.text : 'rgba(255,255,255,0.32)',
                              whiteSpace: 'nowrap',
                            }}>
                              {entry.clientName}
                            </span>
                          )
                        })()}
                        {entry.jiraKey && (
                          <span draggable={false} style={{
                            fontSize: 9,
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.25)',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}>
                            {entry.jiraKey}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Task name with pulse dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, overflow: 'hidden' }}>
                      {activeSubTab === 'today' && isActiveRunning && (
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#7fd89a',
                          flexShrink: 0,
                          animation: 'ltt-pulse 1.5s ease-in-out infinite',
                        }} />
                      )}
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        flex: 1,
                        color: activeSubTab === 'today' && isActiveRunning ? '#7fd89a' : 'rgba(255,255,255,0.9)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.name}
                      </span>
                    </div>

                    {/* Description */}
                    <input
                      type="text"
                      className="desc-field"
                      placeholder="Add description..."
                      draggable={false}
                      onMouseDown={e => e.stopPropagation()}
                      value={editingDescId === entry.id ? localDesc : (entry.jiraDesc ?? '')}
                      onFocus={() => { setEditingDescId(entry.id); setLocalDesc(entry.jiraDesc ?? '') }}
                      onChange={e => setLocalDesc(e.target.value)}
                      onBlur={() => {
                        if (!escapeRef.current && localDesc !== (entry.jiraDesc ?? '')) {
                          updateEntry({ ...entry, jiraDesc: localDesc, updatedAt: new Date().toISOString() })
                        }
                        escapeRef.current = false
                        setEditingDescId(null)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur() }
                        if (e.key === 'Escape') { escapeRef.current = true; (e.currentTarget as HTMLInputElement).blur() }
                      }}
                      style={{
                        fontSize: 10,
                        color: editingDescId === entry.id ? 'rgba(255,255,255,0.55)' : entry.jiraDesc ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.2)',
                        outline: 'none',
                        cursor: 'text',
                        background: 'transparent',
                        border: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minHeight: '1.2em',
                        padding: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Right column: time (today only) + menu */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {activeSubTab === 'today' && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isActiveRunning ? '#7fd89a' : 'rgba(255,255,255,0.55)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.02em',
                    }}>
                      {(displayMs > 0 || isActive) ? formatMs(displayMs) : null}
                    </span>
                  )}
                  <span draggable={false} onMouseDown={e => e.stopPropagation()}>
                    <EntryMenu
                      ms={entry.ms}
                      open={openMenuId === entry.id}
                      onOpen={() => setOpenMenuId(prev => prev === entry.id ? null : entry.id)}
                      onClose={() => setOpenMenuId(null)}
                      onDelete={async () => { await deleteEntry(entry.id) }}
                      onEditDesc={() => { setEditingDescId(entry.id); setOpenMenuId(null) }}
                      onAddTime={async (added) => { await updateEntry({ ...entry, ms: entry.ms + added, updatedAt: new Date().toISOString() }) }}
                      onEditTime={async (newMs) => {
                        await updateEntry({ ...entry, ms: newMs, updatedAt: new Date().toISOString() })
                        if (timerState?.paused && timerState.activeEntryId === entry.id) {
                          await ltt.setTimerBase(entry.id, newMs)
                        }
                      }}
                      onAddToFavourites={entry.jiraKey ? () => modifyFavourites(cur => {
                        if ((cur ?? []).some(f => f.jiraKey === entry.jiraKey)) return cur ?? []
                        return [{ jiraKey: entry.jiraKey!, jiraSummary: entry.jiraSummary, clientName: entry.clientName }, ...(cur ?? [])] as NonNullable<typeof settings>['jiraFavourites']
                      }, `add-entry:${entry.jiraKey}`) : undefined}
                      onSendToJira={entry.jiraKey && entry.ms > 0 ? async () => {
                        const result = await ltt.jiraLogTime(entry.jiraKey!, entry.ms, entry.jiraDesc)
                        if (result.success) await updateEntry({ ...entry, jiraSent: true, updatedAt: new Date().toISOString() })
                        else console.error('[jira] logTime failed:', result.error)
                      } : undefined}
                      onLinkToJira={!entry.jiraKey ? () => { setLinkJiraEntryId(entry.id); setJiraQuery(''); setJiraResults([]) } : undefined}
                      onChangeJiraLink={entry.jiraKey ? () => { setLinkJiraEntryId(entry.id); setJiraQuery(''); setJiraResults([]) } : undefined}
                      onRemoveFromTimer={() => updateEntry({ ...entry, removedFromTimer: true, updatedAt: new Date().toISOString() })}
                      onDuplicate={() => addEntry({
                        id: Date.now(),
                        name: entry.name,
                        ms: 0,
                        ts: Date.now(),
                        jiraKey: entry.jiraKey,
                        jiraSummary: entry.jiraSummary,
                        jiraDesc: entry.jiraDesc,
                        clientName: entry.clientName,
                        jiraSent: false,
                        untracked: false,
                        carriedOver: false,
                        removedFromTimer: false,
                        deletedFromBulk: false,
                        updatedAt: new Date().toISOString(),
                      })}
                      currentTab={activeSubTab}
                      onMoveTo={async (tab) => { await updateEntry({ ...entry, tab, updatedAt: new Date().toISOString() }) }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {activeSubTab === 'today' && <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 14px',
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
          <button
            onClick={() => setBulkSendOpen(true)}
            style={{
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
            ↑ Jira
          </button>
          <button
            onClick={() => setStandupOpen(true)}
            style={{
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
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatMsHHMM(totalMs)}
          </span>
        </div>
      </div>}

      {/* Link to Jira modal */}
      {linkJiraEntryId !== null && (() => {
        const linkEntry = todayEntries.find(e => e.id === linkJiraEntryId)
        if (!linkEntry) return null

        const closeLinkModal = () => { setLinkJiraEntryId(null); setJiraQuery(''); setJiraResults([]) }

        const handleLinkPick = async (issue: { key: string; summary: string }) => {
          const projectKey = issue.key.split('-')[0]
          const clientName = jiraProjectsRef.current.get(projectKey)
          const updated = {
            ...linkEntry,
            name: issue.summary,
            jiraKey: issue.key,
            jiraSummary: issue.summary,
            jiraDesc: linkEntry.jiraDesc || linkEntry.name,
            clientName,
            updatedAt: new Date().toISOString(),
          }
          await updateEntry(updated)
          closeLinkModal()
          ltt.jiraGetClientName(issue.key).then(name => {
            if (name) { patchEntry(updated.id!, undefined, name); updateEntry({ ...updated, clientName: name, updatedAt: new Date().toISOString() }) }
          })
        }

        const favKeys = (settings?.jiraFavourites ?? []).filter(f => !!f?.jiraKey)
        const seenRecent = new Set<string>()
        const recentEntries = [...entries]
          .filter(e => !!e.jiraKey)
          .sort((a, b) => b.ts - a.ts)
          .filter(e => { if (seenRecent.has(e.jiraKey!)) return false; seenRecent.add(e.jiraKey!); return true })
          .slice(0, 30)

        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
            onMouseDown={closeLinkModal}
          >
            <style>{`.ltt-jira-search::placeholder { color: rgba(255,255,255,0.3); }`}</style>
            <div
              style={{ background: 'linear-gradient(145deg, #1e1850, #0e1830)', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', maxHeight: '80%' }}
              onMouseDown={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 6px', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>{linkEntry.jiraKey ? 'Change Jira link' : 'Link to Jira'}</span>
                <button onMouseDown={closeLinkModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
              </div>
              <div style={{ padding: '4px 14px 8px', flexShrink: 0 }}>
                <input
                  autoFocus
                  placeholder="Search Jira issues…"
                  value={jiraQuery}
                  onChange={e => {
                    const q = e.target.value
                    setJiraQuery(q)
                    if (jiraDebounceRef.current) clearTimeout(jiraDebounceRef.current)
                    if (!q.trim()) { setJiraResults([]); setJiraSearching(false); return }
                    setJiraSearching(true)
                    jiraDebounceRef.current = setTimeout(async () => {
                      const results = await ltt.jiraSearch(q)
                      setJiraResults(results)
                      setJiraSearching(false)
                    }, 300)
                  }}
                  className="ltt-jira-search"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 99, padding: '7px 12px', fontSize: 11, color: 'rgba(255,255,255,0.85)', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div className="ltt-panel-scroll" style={{ overflowY: 'auto', flexShrink: 1 }}>
                {jiraSearching && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', padding: '2px 14px 8px', textAlign: 'center' }}>Searching…</div>}
                {!jiraSearching && jiraQuery.trim() && jiraResults.length === 0 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', padding: '2px 14px 8px', textAlign: 'center' }}>No results</div>}
                {!jiraSearching && jiraResults.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {jiraResults.map(issue => {
                      const favs = settings?.jiraFavourites ?? []
                      const isFav = favs.some(f => f.jiraKey === issue.key)
                      return (
                        <JiraRow key={issue.key} icon="◈" jiraKey={issue.key} name={issue.summary}
                          onClick={() => handleLinkPick(issue)}
                          onUnfav={isFav ? () => modifyFavourites(cur => (cur ?? []).filter(f => f.jiraKey !== issue.key), `modal-remove:${issue.key}`) : undefined}
                          onFav={!isFav ? () => modifyFavourites(cur => [{ jiraKey: issue.key, jiraSummary: issue.summary, clientName: jiraProjectsRef.current.get(issue.key.split('-')[0]) }, ...(cur ?? [])] as NonNullable<typeof settings>['jiraFavourites'], `modal-add:${issue.key}`) : undefined}
                        />
                      )
                    })}
                  </div>
                )}
                {!jiraQuery.trim() && (
                  <>
                    {favKeys.length > 0 && (
                      <div style={{ padding: '8px 0 0' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', padding: '0 14px 5px' }}>★ Favourites</div>
                        {favKeys.map(fav => (
                          <JiraRow key={fav.jiraKey} icon="" jiraKey={fav.jiraKey} name={fav.jiraSummary ?? fav.jiraKey}
                            onClick={() => handleLinkPick({ key: fav.jiraKey, summary: fav.jiraSummary ?? fav.jiraKey })} />
                        ))}
                      </div>
                    )}
                    {recentEntries.length > 0 && (
                      <div style={{ borderTop: favKeys.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', marginTop: favKeys.length > 0 ? 4 : 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', padding: '0 14px 5px', marginTop: 8 }}>◷ Recent</div>
                        {recentEntries.map(e => (
                          <JiraRow key={e.jiraKey} icon="" jiraKey={e.jiraKey!} name={e.jiraSummary ?? e.name}
                            onClick={() => handleLinkPick({ key: e.jiraKey!, summary: e.jiraSummary ?? e.name })} />
                        ))}
                      </div>
                    )}
                    {favKeys.length === 0 && recentEntries.length === 0 && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', padding: '12px 14px', textAlign: 'center' }}>No favourites or recent Jira tasks</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
