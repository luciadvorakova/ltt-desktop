import http from 'node:http'
import { shell } from 'electron'
import { EventEmitter } from 'events'
import { store } from './store'
import { supabase } from './supabase'
import { ensureSession } from './auth'
import type { UserSettings } from '../types/index'

function getJiraSettings(): UserSettings { return store.get('settings') ?? {} }
function patchJiraSettings(patch: Partial<UserSettings>): void {
  store.set('settings', { ...getJiraSettings(), ...patch } as UserSettings)
}

const JIRA_CLIENT_ID = 'dwD4aPYHdf9kXcnLDm3lqJhHIuJYoVUf'
const JIRA_REDIRECT_URI = 'http://localhost:7431/jira-auth'
const JIRA_SCOPES = 'read:jira-work write:jira-work offline_access'
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token'

export const jiraAuthEmitter = new EventEmitter()

let _refreshLock: Promise<string | null> | null = null

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

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/jira-auth')) { res.writeHead(404); res.end(); return }

    const parsed = new URL(req.url, 'http://localhost:7431')
    const code = parsed.searchParams.get('code')
    const error = parsed.searchParams.get('error')

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<html><body><p>Jira connected. You can close this tab.</p></body></html>')
    server.close()

    if (error || !code) { console.error('[jira] OAuth callback error:', error); return }

    await exchangeCodeForTokens(code)
  })

  server.listen(7431, () => console.log('[jira] callback server listening on port 7431'))
  server.on('error', (err) => console.error('[jira] callback server error:', err))

  await shell.openExternal(url.toString())
}

async function exchangeCodeForTokens(code: string): Promise<void> {
  try {
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

    patchJiraSettings({
      jiraAccessToken: tokens.access_token,
      jiraRefreshToken: tokens.refresh_token,
      jiraTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })

    await fetchAndStoreJiraProfile(tokens.access_token)
    console.log('[jira] connected, email:', getJiraSettings().jiraUserEmail)

    await ensureSession()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const settings = getJiraSettings()
      await supabase.from('user_settings').upsert({ user_id: user.id, ...settings }, { onConflict: 'user_id' })
      console.log('[jira] settings pushed to Supabase')
    }

    jiraAuthEmitter.emit('jira-auth-success')
  } catch (err) {
    console.error('[jira] exchangeCodeForTokens error:', err)
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
  patchJiraSettings({ jiraUserEmail: me.email ?? undefined })

  const resources = await resourcesRes.json() as { id: string; url: string }[]
  console.log('[JIRA] accessible resources:', JSON.stringify(resources))
  if (Array.isArray(resources) && resources.length > 0) {
    patchJiraSettings({ jiraCloudId: resources[0].id })
  }
}

export async function refreshJiraToken(): Promise<string | null> {
  const refreshToken = getJiraSettings().jiraRefreshToken
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
    console.log('[JIRA] refresh response status:', res.status, JSON.stringify(tokens).slice(0, 200))
    if (!tokens.access_token) { console.error('[jira] refresh failed:', tokens); return null }

    patchJiraSettings({
      jiraAccessToken: tokens.access_token,
      jiraRefreshToken: tokens.refresh_token,
      jiraTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    console.log('[jira] token refreshed')
    return tokens.access_token
  } catch (err) {
    console.error('[jira] refreshJiraToken error:', err)
    return null
  }
}

export async function ensureJiraToken(): Promise<string | null> {
  const s = getJiraSettings()
  const accessToken = s.jiraAccessToken
  if (!accessToken) return null
  const expiry = s.jiraTokenExpiry
  const expiresAt = expiry
    ? (isNaN(Number(expiry)) ? new Date(expiry).getTime() : Number(expiry))
    : null
  const needsRefresh = expiresAt !== null && Date.now() > expiresAt - 5 * 60 * 1000
  console.log('[JIRA] ensureJiraToken, expiry:', expiresAt ? new Date(expiresAt).toISOString() : 'none', 'now:', new Date().toISOString(), 'needs refresh:', needsRefresh)
  if (needsRefresh) {
    if (!_refreshLock) {
      _refreshLock = refreshJiraToken().finally(() => { _refreshLock = null })
    }
    return _refreshLock
  }
  return accessToken
}

export function startJiraRefreshInterval(): void {
  setInterval(async () => {
    const tokenExpiry = getJiraSettings().jiraTokenExpiry
    if (!tokenExpiry) return
    if (Date.now() > new Date(tokenExpiry).getTime() - 5 * 60 * 1000) {
      await ensureJiraToken()
    }
  }, 50 * 60 * 1000)
}

export async function getJiraStatus(): Promise<{ connected: boolean; email?: string; cloudId?: string }> {
  const s = getJiraSettings()
  if (!s.jiraAccessToken) return { connected: false }

  const expiry = s.jiraTokenExpiry
  const expiresAt = expiry
    ? (isNaN(Number(expiry)) ? new Date(expiry).getTime() : Number(expiry))
    : null
  const nearExpiry = expiresAt !== null && Date.now() > expiresAt - 5 * 60 * 1000

  if (!nearExpiry) return { connected: true, email: s.jiraUserEmail, cloudId: s.jiraCloudId }

  const token = await ensureJiraToken()
  if (!token) return { connected: false }
  const fresh = getJiraSettings()
  return { connected: true, email: fresh.jiraUserEmail, cloudId: fresh.jiraCloudId }
}

export function signOutJira(): void {
  patchJiraSettings({
    jiraAccessToken: undefined,
    jiraRefreshToken: undefined,
    jiraTokenExpiry: undefined,
    jiraUserEmail: undefined,
    jiraCloudId: undefined,
  })
}

export async function searchJiraIssues(query: string): Promise<{ key: string; summary: string }[]> {
  const token = await ensureJiraToken()
  if (!token) return []
  const cloudId = getJiraSettings().jiraCloudId
  if (!cloudId) return []

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  const seen = new Set<string>()
  const issues: { key: string; summary: string }[] = []
  const addIssue = (key: string, summary: string) => {
    if (seen.has(key) || issues.length >= 15) return
    seen.add(key); issues.push({ key, summary })
  }

  const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/picker`
  const isKeyLike = /^[A-Z]+-\d+$/i.test(query.trim())

  const runPicker = async (url: string, label: string) => {
    const res = await fetch(url, { headers })
    if (!res.ok) { console.error('[JIRA] picker failed:', label, res.status); return }
    const data = await res.json() as { sections?: { issues?: { key: string; summaryText: string }[] }[] }

    for (const section of data.sections ?? [])
      for (const issue of section.issues ?? [])
        addIssue(issue.key, issue.summaryText)
  }

  try {
    if (isKeyLike) {
      // Exact key match first
      const exactJQL = encodeURIComponent(`issuekey = "${query.toUpperCase()}"`)
      await runPicker(`${base}?query=${encodeURIComponent(query)}&currentJQL=${exactJQL}&showSubTasks=true&limit=15`, 'key-exact')
      // Fill remaining with project prefix
      const prefix = query.trim().split('-')[0].toUpperCase()
      if (issues.length < 15) {
        await runPicker(`${base}?query=${encodeURIComponent(query)}&currentJQL=${encodeURIComponent(`project = ${prefix}`)}&showSubTasks=true&limit=15`, 'key-prefix')
      }
    } else {
      // Text search — try picker with currentJQL=summary~ first
      const summaryJQL = encodeURIComponent(`summary ~ "${query}"`)
      await runPicker(`${base}?query=${encodeURIComponent(query)}&currentJQL=${summaryJQL}&showSubTasks=true&limit=15`, 'text-jql')
      // Fall back to plain picker if no results
      if (issues.length === 0) {
        await runPicker(`${base}?query=${encodeURIComponent(query)}&showSubTasks=true&limit=15`, 'text-plain')
      }
    }

  } catch (err) {
    console.error('[jira] searchJiraIssues error:', err)
  }

  return issues
}

export async function logTimeToJira(issueKey: string, timeSpentMs: number, comment?: string, started?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await ensureJiraToken()
    console.log('[JIRA] logTime token received:', token ? token.slice(0, 20) : 'NULL')
    if (!token) return { success: false, error: 'Not authenticated' }
    const cloudId = getJiraSettings().jiraCloudId
    console.log('[JIRA] logTime cloudId:', cloudId)
    if (!cloudId) return { success: false, error: 'No cloud ID' }

    console.log('[JIRA] logTime posting to:', issueKey, 'timeSeconds:', Math.round(timeSpentMs / 1000))
    try {
      const res = await fetch(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/worklog`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            timeSpentSeconds: Math.round(timeSpentMs / 1000),
            started: (started ?? new Date().toISOString()).replace('Z', '+0000'),
            comment: {
              type: 'doc', version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: comment ?? '' }] }],
            },
          }),
        }
      )
      console.log('[JIRA] logTime response:', res.status)
      if (!res.ok) {
        const body = await res.text()
        console.error('[jira] logTime failed:', res.status, body)
        return { success: false, error: `HTTP ${res.status}` }
      }
      return { success: true }
    } catch (err) {
      console.error('[JIRA] logTime fetch error:', err)
      return { success: false, error: String(err) }
    }
  } catch (err) {
    console.error('[jira] logTimeToJira error:', err)
    return { success: false, error: String(err) }
  }
}

export async function getJiraIssueClientName(issueKey: string): Promise<string | null> {
  const token = await ensureJiraToken()
  if (!token) return null
  const cloudId = getJiraSettings().jiraCloudId
  if (!cloudId) return null

  try {
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}?fields=parent`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const data = await res.json() as { fields: { parent?: { key?: string } } }
    const parentKey = data.fields.parent?.key
    if (!parentKey) return null

    const parentRes = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${parentKey}?fields=summary,issuetype,customfield_10252`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (!parentRes.ok) return null
    const parentData = await parentRes.json() as { fields: { summary?: string; customfield_10252?: string[] } }
    console.log('[JIRA] customfield_10252:', JSON.stringify(parentData.fields?.customfield_10252))
    const clientLabel = parentData.fields.customfield_10252?.[0]
    if (clientLabel) return clientLabel
    const parentSummary = parentData.fields.summary
    if (parentSummary) return parentSummary.split(' ')[0]
    return null
  } catch (err) {
    console.error('[jira] getJiraIssueClientName error:', err)
    return null
  }
}

export async function getJiraProjects(): Promise<{ key: string; name: string }[]> {
  const accessToken = await ensureJiraToken()
  if (!accessToken) return []
  const cloudId = getJiraSettings().jiraCloudId
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
