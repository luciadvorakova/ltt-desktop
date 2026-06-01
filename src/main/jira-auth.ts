import { shell } from 'electron'
import { store } from './store'

const JIRA_CLIENT_ID = 'dwD4aPYHdf9kXcnLDm3lqJhHIuJYoVUf'
const JIRA_REDIRECT_URI = 'ltt://jira-auth'
const JIRA_SCOPES = 'read:jira-work write:jira-work offline_access'
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token'

export async function signInWithJira(): Promise<void> {
  const state = Math.random().toString(36).slice(2)
  const url = new URL('https://auth.atlassian.com/authorize')
  url.searchParams.set('audience', 'api.atlassian.com')
  url.searchParams.set('client_id', JIRA_CLIENT_ID)
  url.searchParams.set('scope', JIRA_SCOPES)
  url.searchParams.set('redirect_uri', JIRA_REDIRECT_URI)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('prompt', 'consent')
  await shell.openExternal(url.toString())
}

export async function handleJiraCallback(url: string): Promise<void> {
  try {
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')
    if (!code) { console.error('[jira] no code in callback URL'); return }

    const secret = process.env.JIRA_CLIENT_SECRET
    if (!secret) { console.error('[jira] JIRA_CLIENT_SECRET not set'); return }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: JIRA_CLIENT_ID,
        client_secret: secret,
        code,
        redirect_uri: JIRA_REDIRECT_URI,
      }),
    })
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    if (!tokens.access_token) { console.error('[jira] token exchange failed:', tokens); return }

    store.set('jiraAccessToken', tokens.access_token)
    store.set('jiraRefreshToken', tokens.refresh_token)
    store.set('jiraExpiresAt', Date.now() + tokens.expires_in * 1000)

    await fetchAndStoreJiraProfile(tokens.access_token)
    console.log('[jira] connected, email:', store.get('jiraEmail'))
  } catch (err) {
    console.error('[jira] handleJiraCallback error:', err)
  }
}

async function fetchAndStoreJiraProfile(accessToken: string): Promise<void> {
  const [meRes, resourcesRes] = await Promise.all([
    fetch('https://api.atlassian.com/me', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }),
    fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }),
  ])

  const me = await meRes.json() as { email?: string }
  store.set('jiraEmail', me.email ?? null)

  const resources = await resourcesRes.json() as { id: string; url: string }[]
  console.log('[JIRA] accessible resources:', JSON.stringify(resources))
  if (Array.isArray(resources) && resources.length > 0) {
    store.set('jiraCloudId', resources[0].id)
    store.set('jiraCloudUrl', resources[0].url)
  }
}

export async function refreshJiraToken(): Promise<string | null> {
  const refreshToken = store.get('jiraRefreshToken')
  if (!refreshToken) return null

  const secret = process.env.JIRA_CLIENT_SECRET
  if (!secret) return null

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: JIRA_CLIENT_ID,
        client_secret: secret,
        refresh_token: refreshToken,
      }),
    })
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    if (!tokens.access_token) { console.error('[jira] refresh failed:', tokens); return null }

    store.set('jiraAccessToken', tokens.access_token)
    store.set('jiraRefreshToken', tokens.refresh_token)
    store.set('jiraExpiresAt', Date.now() + tokens.expires_in * 1000)
    console.log('[jira] token refreshed')
    return tokens.access_token
  } catch (err) {
    console.error('[jira] refreshJiraToken error:', err)
    return null
  }
}

export async function ensureJiraToken(): Promise<string | null> {
  const expiresAt = store.get('jiraExpiresAt')
  const accessToken = store.get('jiraAccessToken')
  if (!accessToken) return null
  if (expiresAt && Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshJiraToken()
  }
  return accessToken
}

export function startJiraRefreshInterval(): void {
  setInterval(async () => {
    const expiresAt = store.get('jiraExpiresAt')
    if (!expiresAt) return
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      await refreshJiraToken()
    }
  }, 50 * 60 * 1000)
}

export function getJiraStatus(): { connected: boolean; email?: string; cloudId?: string } {
  const accessToken = store.get('jiraAccessToken')
  if (!accessToken) return { connected: false }
  return {
    connected: true,
    email: store.get('jiraEmail') ?? undefined,
    cloudId: store.get('jiraCloudId') ?? undefined,
  }
}

export function signOutJira(): void {
  store.set('jiraAccessToken', null)
  store.set('jiraRefreshToken', null)
  store.set('jiraExpiresAt', null)
  store.set('jiraEmail', null)
  store.set('jiraCloudId', null)
  store.set('jiraCloudUrl', null)
}

export async function searchJiraIssues(query: string): Promise<{ key: string; summary: string }[]> {
  const token = await ensureJiraToken()
  if (!token) return []
  const cloudId = store.get('jiraCloudId')
  if (!cloudId) return []

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  const seen = new Set<string>()
  const issues: { key: string; summary: string }[] = []
  const addIssue = (key: string, summary: string) => {
    if (!seen.has(key)) { seen.add(key); issues.push({ key, summary }) }
  }

  const isKeyLike = /^[A-Z]+-\d+$/i.test(query.trim())
  const projectPrefix = isKeyLike ? query.trim().split('-')[0].toUpperCase() : null

  const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/picker`

  const pickerUrls: string[] = [
    `${base}?query=${encodeURIComponent(query)}&showSubTasks=true&limit=50`,
  ]
  if (projectPrefix) {
    pickerUrls.push(`${base}?query=${encodeURIComponent(query)}&currentJQL=${encodeURIComponent(`project=${projectPrefix}`)}&showSubTasks=true&limit=50`)
    pickerUrls.push(`${base}?query=${encodeURIComponent(projectPrefix)}&showSubTasks=true&limit=50`)
  }

  try {
    const pickerResults = await Promise.all(pickerUrls.map(url => fetch(url, { headers })))
    for (let i = 0; i < pickerResults.length; i++) {
      const res = pickerResults[i]
      if (!res.ok) { console.error('[jira] picker failed:', res.status, pickerUrls[i]); continue }
      const data = await res.json() as { sections?: { issues?: { key: string; summaryText: string }[] }[] }
      console.log('[JIRA] picker raw response', i, ':', JSON.stringify(data).slice(0, 500))
      for (const section of data.sections ?? [])
        for (const issue of section.issues ?? [])
          addIssue(issue.key, issue.summaryText)
    }
    console.log('[JIRA] picker total:', issues.length)

    // JQL summary search
    const jql = encodeURIComponent(`project in projectsWhereUserHasPermission() AND summary ~ "${query}" ORDER BY updated DESC`)
    const jqlRes = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/search?jql=${jql}&maxResults=20&fields=summary`, { headers })
    const jqlData = await jqlRes.json() as { issues?: { key: string; fields: { summary: string } }[]; errorMessages?: string[]; message?: string }
    console.log('[JIRA] JQL response body:', JSON.stringify(jqlData).slice(0, 200))
    if (jqlRes.ok) {
      for (const issue of jqlData.issues ?? [])
        addIssue(issue.key, issue.fields.summary)
    }
    console.log('[JIRA] total results:', issues.length)
  } catch (err) {
    console.error('[jira] searchJiraIssues error:', err)
  }

  return issues
}

export async function logTimeToJira(issueKey: string, timeSpentMs: number, comment?: string): Promise<{ success: boolean; error?: string }> {
  const token = await ensureJiraToken()
  if (!token) return { success: false, error: 'Not authenticated' }
  const cloudId = store.get('jiraCloudId')
  if (!cloudId) return { success: false, error: 'No cloud ID' }

  try {
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/worklog`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          timeSpentSeconds: Math.round(timeSpentMs / 1000),
          comment: {
            type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: comment ?? '' }] }],
          },
        }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      console.error('[jira] logTime failed:', res.status, body)
      return { success: false, error: `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    console.error('[jira] logTimeToJira error:', err)
    return { success: false, error: String(err) }
  }
}

export async function getJiraProjects(): Promise<{ key: string; name: string }[]> {
  const accessToken = await ensureJiraToken()
  if (!accessToken) return []
  const cloudId = store.get('jiraCloudId')
  if (!cloudId) return []

  try {
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
    )
    const data = await res.json() as { values?: { key: string; name: string }[] }
    return (data.values ?? []).map(p => ({ key: p.key, name: p.name }))
  } catch (err) {
    console.error('[jira] getJiraProjects error:', err)
    return []
  }
}
