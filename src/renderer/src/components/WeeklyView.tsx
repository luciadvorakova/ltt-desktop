import { useState, useMemo } from 'react'
import { useEntries } from '../hooks/useEntries'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function dateToDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayKey(ts: number): string {
  return dateToDayKey(new Date(ts))
}

function formatHHMM(ms: number): string {
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatNavLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mStr = `${monday.getDate()} ${MONTHS[monday.getMonth()]}`
  const sStr = `${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`
  return `${mStr} – ${sStr}`
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${MONTHS[monday.getMonth()]}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]}–${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`
}

export function WeeklyView() {
  const { entries } = useEntries()
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))

  const todayKey = dateToDayKey(new Date())

  const msByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      const key = getDayKey(e.ts)
      map.set(key, (map.get(key) ?? 0) + e.ms)
    }
    return map
  }, [entries])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }), [weekStart])

  const weekDayMs = weekDays.map(d => msByDay.get(dateToDayKey(d)) ?? 0)
  const weekTotalMs = weekDayMs.reduce((a, b) => a + b, 0)
  const weekMaxMs = Math.max(...weekDayMs, 1)

  const prevWeeks = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => {
      const monday = new Date(weekStart)
      monday.setDate(weekStart.getDate() - (i + 1) * 7)
      const totalMs = Array.from({ length: 7 }, (_, j) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + j)
        return msByDay.get(dateToDayKey(d)) ?? 0
      }).reduce((a, b) => a + b, 0)
      return { monday, totalMs }
    }), [weekStart, msByDay])

  const prevWeekMax = Math.max(...prevWeeks.map(w => w.totalMs), 1)

  const goBack = () => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() - 7); return nd })
  const goForward = () => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() + 7); return nd })

  const navBtnStyle: React.CSSProperties = { width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Nav row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button style={navBtnStyle} onClick={goBack}>‹</button>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.01em' }}>
          {formatNavLabel(weekStart)}
        </span>
        <button style={navBtnStyle} onClick={goForward}>›</button>
      </div>

      <div style={{ padding: '0 4px' }}>

        {/* This week total */}
        <div style={{ padding: '16px 14px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
            This week
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.3px' }}>
            {formatHHMM(weekTotalMs)}
          </span>
        </div>

        {/* Day rows */}
        <div style={{ padding: '4px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weekDays.map((d, i) => {
            const key = dateToDayKey(d)
            const isToday = key === todayKey
            const ms = weekDayMs[i]
            const pct = (ms / weekMaxMs) * 100
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: isToday ? 700 : 500, color: isToday ? 'rgba(127,216,154,0.9)' : 'rgba(255,255,255,0.35)', width: 22, flexShrink: 0 }}>
                  {DAY_LABELS[i]}
                </span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: isToday ? 'linear-gradient(90deg, rgba(127,216,154,0.8), rgba(80,200,130,0.5))' : 'linear-gradient(90deg, rgba(160,140,255,0.7), rgba(200,160,255,0.5))' }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: isToday ? 600 : 400, color: isToday ? 'rgba(127,216,154,0.8)' : 'rgba(255,255,255,0.35)', width: 32, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {ms > 0 ? formatHHMM(ms) : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '10px 14px 12px' }} />

        {/* Previous weeks label */}
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', padding: '0 14px 10px' }}>
          Previous weeks
        </div>

        {/* Previous week rows */}
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prevWeeks.map(({ monday, totalMs }) => {
            const pct = (totalMs / prevWeekMax) * 100
            return (
              <div key={monday.toISOString()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', width: 72, flexShrink: 0 }}>
                  {formatWeekLabel(monday)}
                </span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: 'rgba(160,140,255,0.35)' }} />
                </div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', width: 32, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {totalMs > 0 ? formatHHMM(totalMs) : '—'}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
