/**
 * One-time migration: re-fetch correct client_name from Jira for all entries with a jiraKey.
 *
 * Run (dry-run, default):
 *   npx ts-node --project scripts/tsconfig.json scripts/fix-client-names.ts
 *
 * Run (apply changes):
 *   npx ts-node --project scripts/tsconfig.json scripts/fix-client-names.ts --apply
 *
 * Reads Jira credentials and session from the electron-store config at:
 *   ~/Library/Application Support/ltt-desktop/config.json
 * The app must be installed and you must be signed in to both LTT and Jira before running.
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://rzjbfqgkprozguyjrxbp.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6amJmcWdrcHJvemd1eWpyeGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTU0OTIsImV4cCI6MjA5MzgzMTQ5Mn0.PN4vN-_MQkYSGqsKaVT1XFK27BVDW0dnlX9BXXcGhVQ'

const DRY_RUN = !process.argv.includes('--apply')

// --- Load credentials from electron-store ---

const storePath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'ltt-desktop',
  'config.json'
)

let storeData: Record<string, any> = {}
try {
  storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'))
} catch {
  console.error('[ERROR] Could not read electron store at:', storePath)
  console.error('        Launch the app and sign in, then try again.')
  process.exit(1)
}

const session = storeData.session as { access_token: string; refresh_token: string } | undefined
const settings = storeData.settings as Record<string, any> | undefined

if (!session?.access_token) {
  console.error('[ERROR] No session found in electron store. Launch the app and sign in first.')
  process.exit(1)
}

const jiraAccessToken: string | undefined = settings?.jiraAccessToken
const jiraCloudId: string | undefined = settings?.jiraCloudId

if (!jiraAccessToken || !jiraCloudId) {
  console.error('[ERROR] No Jira credentials found. Connect Jira in the app first.')
  process.exit(1)
}

// --- Supabase client ---

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- Jira client-name logic (mirrors getJiraIssueClientName in jira-auth.ts) ---

async function getClientName(issueKey: string): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${jiraAccessToken}`,
    Accept: 'application/json',
  }

  const res = await fetch(
    `https://api.atlassian.com/ex/jira/${jiraCloudId}/rest/api/3/issue/${issueKey}?fields=parent`,
    { headers }
  )
  if (!res.ok) return null

  const data = await res.json() as { fields: { parent?: { key?: string } } }
  const parentKey = data.fields.parent?.key
  if (!parentKey) return null

  const parentRes = await fetch(
    `https://api.atlassian.com/ex/jira/${jiraCloudId}/rest/api/3/issue/${parentKey}?fields=summary,issuetype,customfield_10252`,
    { headers }
  )
  if (!parentRes.ok) return null

  const parentData = await parentRes.json() as {
    fields: { summary?: string; customfield_10252?: string[] }
  }
  const clientLabel = parentData.fields.customfield_10252?.[0]
  if (clientLabel) return clientLabel
  const parentSummary = parentData.fields.summary
  if (parentSummary) return parentSummary.split(' ')[0]
  return null
}

// --- Main ---

async function main() {
  if (DRY_RUN) {
    console.log('[DRY RUN] No changes will be written. Pass --apply to commit updates.\n')
  }

  await supabase.auth.setSession(session!)

  const { data: entries, error } = await supabase
    .from('time_entries')
    .select('id, jira_key, client_name')
    .not('jira_key', 'is', null)

  if (error) {
    console.error('[ERROR] Failed to load entries:', error.message)
    process.exit(1)
  }

  console.log(`Found ${entries.length} entries with a jira_key.\n`)

  let wouldUpdate = 0
  let alreadyCorrect = 0
  let failed = 0

  for (const entry of entries) {
    const newClientName = await getClientName(entry.jira_key)

    if (newClientName === null) {
      console.log(`[SKIP]  ${entry.jira_key}: could not fetch client name`)
      failed++
    } else if (newClientName === entry.client_name) {
      alreadyCorrect++
    } else {
      console.log(`[FIX]   ${entry.jira_key}: "${entry.client_name ?? 'null'}" → "${newClientName}"`)
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('time_entries')
          .update({ client_name: newClientName })
          .eq('id', entry.id)
        if (updateError) {
          console.error(`        [ERROR] ${updateError.message}`)
          failed++
          continue
        }
      }
      wouldUpdate++
    }

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(
    `\nDone. ${wouldUpdate} ${DRY_RUN ? 'would be updated' : 'updated'}, ` +
    `${alreadyCorrect} already correct, ${failed} skipped/failed.`
  )

  if (DRY_RUN && wouldUpdate > 0) {
    console.log('\nRe-run with --apply to write these changes to Supabase.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
