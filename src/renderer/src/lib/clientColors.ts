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

export const CLIENT_COLOR_PALETTE_LIGHT: ClientColorEntry[] = [
  { bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.3)',  text: '#6b21a8' }, // purple
  { bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)',  text: '#0369a1' }, // sky
  { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.3)',  text: '#0f766e' }, // teal
  { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  text: '#9a3412' }, // orange
  { bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.3)',  text: '#9d174d' }, // pink
  { bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)',   text: '#854d0e' }, // yellow
  { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  text: '#3730a3' }, // indigo
  { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   text: '#0e7490' }, // cyan
  { bg: 'rgba(132,204,22,0.1)',   border: 'rgba(132,204,22,0.3)',  text: '#3f6212' }, // lime
  { bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',  text: '#991b1b' }, // red
  { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#92400e' }, // amber
  { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  text: '#5b21b6' }, // violet
  { bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',  text: '#15803d' }, // green
  { bg: 'rgba(244,63,94,0.1)',    border: 'rgba(244,63,94,0.25)',  text: '#9f1239' }, // rose
  { bg: 'rgba(0,210,200,0.1)',    border: 'rgba(0,210,200,0.25)',  text: '#0e7490' }, // aqua
  { bg: 'rgba(255,193,7,0.12)',   border: 'rgba(255,193,7,0.3)',   text: '#92400e' }, // gold
  { bg: 'rgba(196,181,253,0.15)', border: 'rgba(196,181,253,0.35)',text: '#5b21b6' }, // lavender
  { bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.25)', text: '#065f46' }, // emerald
  { bg: 'rgba(255,127,80,0.12)',  border: 'rgba(255,127,80,0.3)',  text: '#9a3412' }, // coral
  { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#1e40af' }, // blue
]

export function getClientColor(
  clientName: string | undefined,
  clientColors: Record<string, number> | undefined,
  theme: 'dark' | 'light' = 'dark'
): ClientColorEntry | null {
  if (!clientName || !clientColors) return null
  const idx = clientColors[clientName]
  if (idx === undefined) return null
  const palette = theme === 'light' ? CLIENT_COLOR_PALETTE_LIGHT : CLIENT_COLOR_PALETTE
  return palette[idx % palette.length]
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
