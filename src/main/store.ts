import Store from 'electron-store'
import type { UserSettings, TimerState } from '../types/index'

interface StoreSchema {
  session: { access_token: string; refresh_token: string } | null
  settings: UserSettings | null
  timerState: TimerState | null
  deletedIds: number[]
}

export const store = new Store<StoreSchema>({
  defaults: {
    session: null,
    settings: null,
    timerState: null,
    deletedIds: [],
  },
})
