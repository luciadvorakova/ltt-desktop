import Store from 'electron-store'
import { app } from 'electron'
import path from 'node:path'
import type { UserSettings, TimerState } from '../types/index'

// CRITICAL: must run before `new Store()` so the dev build never shares a
// store file (session + tokens) with the production build. Import hoisting
// means this file executes before index.ts's top-level code.
if (!app.isPackaged && !process.env.E2E_TEST_SESSION) {
  app.setPath('userData', path.join(app.getPath('userData'), 'dev'))
}

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
