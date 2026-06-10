import type { TimeEntry } from '../../../types/index'

export interface ClientColorEntry {
  bg: string
  border: string
  text: string
}

export const CLIENT_COLOR_PALETTE: ClientColorEntry[] = [
  { bg: 'rgba(168,85,247,0.18)',  border: 'rgba(168,85,247,0.35)',  text: '#c084fc' }, // purple
  { bg: 'rgba(56,189,248,0.18)',  border: 'rgba(56,189,248,0.35)',  text: '#7dd3fc' }, // sky
  { bg: 'rgba(20,184,166,0.18)',  border: 'rgba(20,184,166,0.35)',  text: '#5eead4' }, // teal
  { bg: 'rgba(249,115,22,0.18)',  border: 'rgba(249,115,22,0.35)',  text: '#fb923c' }, // orange
  { bg: 'rgba(236,72,153,0.18)',  border: 'rgba(236,72,153,0.35)',  text: '#f472b6' }, // pink
  { bg: 'rgba(234,179,8,0.18)',   border: 'rgba(234,179,8,0.35)',   text: '#fde047' }, // yellow
  { bg: 'rgba(99,102,241,0.18)',  border: 'rgba(99,102,241,0.35)',  text: '#818cf8' }, // indigo
  { bg: 'rgba(6,182,212,0.18)',   border: 'rgba(6,182,212,0.35)',   text: '#22d3ee' }, // cyan
  { bg: 'rgba(132,204,22,0.18)',  border: 'rgba(132,204,22,0.35)',  text: '#a3e635' }, // lime
  { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.35)',   text: '#f87171' }, // red
  { bg: 'rgba(245,158,11,0.18)',  border: 'rgba(245,158,11,0.35)',  text: '#fbbf24' }, // amber
  { bg: 'rgba(139,92,246,0.18)',  border: 'rgba(139,92,246,0.35)',  text: '#a78bfa' }, // violet
  { bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.35)',   text: '#4ade80' }, // green
  { bg: 'rgba(244,63,94,0.18)',   border: 'rgba(244,63,94,0.35)',   text: '#fb7185' }, // rose
  { bg: 'rgba(0,210,200,0.18)',   border: 'rgba(0,210,200,0.35)',   text: '#40e0d0' }, // aqua
  { bg: 'rgba(255,193,7,0.18)',   border: 'rgba(255,193,7,0.35)',   text: '#ffc107' }, // gold
  { bg: 'rgba(196,181,253,0.18)', border: 'rgba(196,181,253,0.35)', text: '#ddd6fe' }, // lavender
  { bg: 'rgba(16,185,129,0.18)',  border: 'rgba(16,185,129,0.35)',  text: '#34d399' }, // emerald
  { bg: 'rgba(255,127,80,0.18)',  border: 'rgba(255,127,80,0.35)',  text: '#ff8c69' }, // coral
  { bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.35)',  text: '#60a5fa' }, // blue
]

export function getClientColor(
  clientName: string | undefined,
  clientColors: Record<string, number> | undefined
): ClientColorEntry | null {
  if (!clientName || !clientColors) return null
  const idx = clientColors[clientName]
  if (idx === undefined) return null
  return CLIENT_COLOR_PALETTE[idx % CLIENT_COLOR_PALETTE.length]
}

export function assignClientColors(
  entries: TimeEntry[],
  currentColors: Record<string, number>
): Record<string, number> | null {
  const allClientNames = new Set(
    entries.filter(e => e.clientName).map(e => e.clientName!)
  )

  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recentClientNames = new Set(
    entries
      .filter(e => e.clientName && e.ts > cutoff)
      .map(e => e.clientName!)
  )

  // Indices already claimed by active (recently-seen) clients
  const usedIndices = new Set(
    Object.entries(currentColors)
      .filter(([name]) => recentClientNames.has(name))
      .map(([, idx]) => idx)
  )

  const newClients = [...allClientNames].filter(name => !(name in currentColors))
  if (newClients.length === 0) return null

  const updated = { ...currentColors }
  for (const name of newClients) {
    let idx = 0
    while (usedIndices.has(idx)) idx++
    updated[name] = idx
    usedIndices.add(idx)
  }

  return updated
}
