import Store from 'electron-store'
import type { UserSettings, TimerState } from '../types/index'

interface StoreSchema {
  session: { access_token: string; refresh_token: string } | null
  settings: UserSettings | null
  timerState: TimerState | null
  deletedIds: number[]
  deletedEntryNames: { name: string; date: string }[]
  jiraAccessToken: string | null
  jiraRefreshToken: string | null
  jiraExpiresAt: number | null
  jiraEmail: string | null
  jiraCloudId: string | null
  jiraCloudUrl: string | null
}

export const store = new Store<StoreSchema>({
  defaults: {
    session: null,
    settings: null,
    timerState: null,
    deletedIds: [],
    deletedEntryNames: [],
    jiraAccessToken: null,
    jiraRefreshToken: null,
    jiraExpiresAt: null,
    jiraEmail: null,
    jiraCloudId: null,
    jiraCloudUrl: null,
  },
})
