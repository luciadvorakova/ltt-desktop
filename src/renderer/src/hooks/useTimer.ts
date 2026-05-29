import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerState } from '../../../types/index'
import { useLtt } from './useLtt'

interface UseTimerResult {
  timerState: TimerState | null
  elapsed: number
  start: (entryId: number) => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
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

  const start = useCallback(async (entryId: number) => {
    await ltt.startTimer(entryId)
    await refreshState()
  }, [ltt, refreshState])

  const pause = useCallback(async () => {
    await ltt.pauseTimer()
    await refreshState()
  }, [ltt, refreshState])

  const stop = useCallback(async () => {
    await ltt.stopTimer()
    await refreshState()
  }, [ltt, refreshState])

  return { timerState, elapsed, start, pause, stop }
}
