import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerState } from '../../../types/index'
import { useLtt } from './useLtt'

interface UseTimerResult {
  timerState: TimerState | null
  elapsed: number
  start: (entryId: number) => Promise<{ id: number; ms: number } | null>
  pause: () => Promise<void>
  stop: () => Promise<{ id: number; ms: number } | null>
}

export function useTimer(): UseTimerResult {
  const ltt = useLtt()
  const [timerState, setTimerState] = useState<TimerState | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshState = useCallback(async () => {
    const state = await ltt.getTimerState()
    setTimerState(state)
    return state
  }, [ltt])

  // Tick interval — updates elapsed every 500ms from startedAt
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timerState?.running && timerState.startedAt !== null) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - (timerState.startedAt as number))
      }, 500)
    } else {
      setElapsed(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState])

  // Load initial state on mount
  useEffect(() => {
    refreshState()
  }, [refreshState])

  const start = useCallback(async (entryId: number): Promise<{ id: number; ms: number } | null> => {
    setElapsed(0)
    const prevSaved = timerState?.activeEntryId && timerState.activeEntryId !== entryId
      ? await ltt.stopTimer()
      : null
    await ltt.startTimer(entryId)
    await refreshState()
    return prevSaved as { id: number; ms: number } | null
  }, [ltt, refreshState, timerState])

  const pause = useCallback(async () => {
    await ltt.pauseTimer()
    await refreshState()
  }, [ltt, refreshState])

  const stop = useCallback(async (): Promise<{ id: number; ms: number } | null> => {
    const result = await ltt.stopTimer()
    await refreshState()
    return result as { id: number; ms: number } | null
  }, [ltt, refreshState])

  return { timerState, elapsed, start, pause, stop }
}
