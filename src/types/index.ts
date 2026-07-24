export interface TimeEntry {
  id: number
  name: string
  ms: number
  ts: number
  updatedAt: string
  jiraKey?: string
  jiraSummary?: string
  jiraDesc?: string
  jiraSent: boolean
  untracked: boolean
  clientName?: string
  sortOrder?: number
  carriedOver: boolean
  removedFromTimer: boolean
  deletedFromBulk: boolean
  gcalEventId?: string
  gcalEndTime?: number
  gcalMeetLink?: string
  isMeeting?: boolean
  gcal_end_time?: string
  description?: string
  tab?: 'today' | 'tomorrow' | 'later'
  lastTrackedDate?: string  // ISO date string YYYY-MM-DD
}

export interface UserSettings {
  lttTitle?: string
  jiraAccessToken?: string
  jiraRefreshToken?: string
  jiraTokenExpiry?: string
  jiraCloudId?: string
  jiraSiteName?: string
  jiraUserName?: string
  jiraUserEmail?: string
  jiraAccountId?: string
  gcalEmail?: string
  gcalAccessToken?: string
  gcalRefreshToken?: string
  gcalTokenExpiry?: string
  gcalLastSyncDate?: string
  slackChannel?: string
  slackUserId?: string
  manualTimerCleanup?: boolean
  jiraFavourites?: { jiraKey: string; jiraSummary?: string; clientName?: string }[]
  jiraRecent?: { jiraKey: string; jiraSummary?: string; clientName?: string }[]
  lastStandupDate?: string
  standupDismissedDate?: string
  clientColors?: Record<string, number>
  theme?: 'dark' | 'light'
}

export interface TimerState {
  activeEntryId: number | null
  startedAt: number | null
  baseMs: number
  running: boolean
  paused: boolean
}

export interface JiraIssue {
  key: string
  summary: string
  projectName?: string
  parentKey?: string
  parentSummary?: string
}
