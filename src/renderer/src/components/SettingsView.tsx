import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useLtt } from '../hooks/useLtt'
import type { Notification } from '../hooks/useNotifications'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ width: 28, height: 16, borderRadius: 99, background: on ? 'var(--accent-running-bg)' : 'var(--bg-btn-subtle)', border: `1px solid ${on ? 'var(--accent-running-border)' : 'var(--border-btn)'}`, position: 'relative', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 14 : 2, transition: 'left 0.2s' }} />
    </div>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }
const sectionLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px 14px 3px' }
const rowLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }
const rowSubStyle: React.CSSProperties = { fontSize: 9, color: 'var(--text-secondary)', marginTop: 1 }
const connectedEmailStyle: React.CSSProperties = { fontSize: 9, color: 'var(--text-connect)', marginTop: 1 }
const inputStyle: React.CSSProperties = { flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 99, padding: '4px 10px', fontSize: 10, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', WebkitAppearance: 'none' }
const saveBtnStyle: React.CSSProperties = { fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'var(--bg-btn-subtle)', border: '1px solid var(--border-btn)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
const connectBtnStyle: React.CSSProperties = { fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'var(--bg-btn-connect)', border: '1px solid var(--border-connect)', color: 'var(--text-connect)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }
const disconnectBtnStyle: React.CSSProperties = { fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'var(--bg-btn-subtle)', border: '1px solid var(--border-btn)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
const fieldLabelStyle: React.CSSProperties = { fontSize: 9, color: 'var(--text-secondary)', width: 56, flexShrink: 0 }
const dividerStyle: React.CSSProperties = { height: 1, background: 'var(--border-subtle)', margin: '6px 0' }

export function SettingsView({
  onClose,
  notifications,
  dismissNotification,
  signOut,
}: {
  onClose: () => void
  notifications: Notification[]
  dismissNotification: (id: string) => void
  signOut: () => Promise<void>
}) {
  const { settings, updateSetting } = useSettings()
  const ltt = useLtt()
  const [slackChannel, setSlackChannel] = useState('')
  const [slackUserId, setSlackUserId] = useState('')
  const [jiraStatus, setJiraStatus] = useState<{ connected: boolean; email?: string; cloudId?: string }>({ connected: false })
  const [gcalEmail, setGcalEmail] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (settings) {
      setSlackChannel(settings.slackChannel ?? '')
      setSlackUserId(settings.slackUserId ?? '')
      if (settings.gcalEmail !== undefined) setGcalEmail(settings.gcalEmail)
    }
  }, [settings])

  useEffect(() => {
    ltt.jiraGetStatus().then(setJiraStatus)
    const handler = () => ltt.jiraGetStatus().then(setJiraStatus)
    ltt.on('jira-auth-success', handler)
    return () => ltt.off('jira-auth-success', handler)
  }, [ltt])

  useEffect(() => {
    const handler = () => ltt.getSettings().then(s => setGcalEmail(s?.gcalEmail))
    ltt.on('gcal-auth-success', handler)
    return () => ltt.off('gcal-auth-success', handler)
  }, [ltt])

  const jiraEmail = jiraStatus.email ?? settings?.jiraUserEmail ?? settings?.jiraUserName

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div
        onClick={onClose}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', minHeight: 34, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          ‹ Timer
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Settings
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* NOTIFICATIONS */}
        {notifications.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Notifications</div>
            {notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 14px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.id === 'standup-not-sent' ? '#e0a052' : '#e05252', flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={rowLabelStyle}>{n.title}</div>
                  <div style={rowSubStyle}>{n.message}</div>
                </div>
                <button
                  style={connectBtnStyle}
                  onClick={() => { n.onAction(); if (n.id === 'standup-not-sent') onClose() }}
                >
                  {n.actionLabel}
                </button>
                <button
                  style={disconnectBtnStyle}
                  onClick={() => dismissNotification(n.id)}
                >
                  Dismiss
                </button>
              </div>
            ))}
            <div style={dividerStyle} />
          </>
        )}

        {/* CONNECTIONS */}
        <div style={sectionLabelStyle}>Connections</div>

        {/* Jira */}
        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <div style={rowLabelStyle}>Jira</div>
            {jiraStatus.connected
              ? <div style={connectedEmailStyle}>✓ {jiraEmail}</div>
              : <div style={rowSubStyle}>Search issues and log time directly.</div>
            }
          </div>
          {jiraStatus.connected ? (
            <button style={disconnectBtnStyle} onClick={() => { ltt.jiraSignOut(); setJiraStatus({ connected: false }) }}>Disconnect</button>
          ) : (
            <button style={connectBtnStyle} onClick={() => ltt.jiraSignIn()}>Connect</button>
          )}
        </div>

        {/* Google Calendar */}
        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <div style={rowLabelStyle}>Google Calendar</div>
            {gcalEmail
              ? <div style={connectedEmailStyle}>✓ {gcalEmail}</div>
              : <div style={rowSubStyle}>Import events as time entries.</div>
            }
          </div>
          {gcalEmail ? (
            <button style={disconnectBtnStyle} onClick={async () => {
              setGcalEmail(undefined)
              const cleared = {
                ...(settings ?? {}),
                gcalEmail: undefined,
                gcalAccessToken: undefined,
                gcalRefreshToken: undefined,
                gcalTokenExpiry: undefined,
                gcalLastSyncDate: undefined,
              }
              await ltt.setSettings(cleared)
              const session = await ltt.getSession()
              if (session) {
                try {
                  const userId = JSON.parse(atob(session.access_token.split('.')[1])).sub as string
                  await ltt.pushSettings(userId)
                } catch { /* ignore */ }
              }
            }}>Disconnect</button>
          ) : (
            <button style={connectBtnStyle} onClick={() => ltt.gcalSignIn()}>Connect</button>
          )}
        </div>

        <div style={dividerStyle} />

        {/* SLACK STANDUP */}
        <div style={sectionLabelStyle}>Slack standup</div>

        <div style={rowStyle}>
          <span style={fieldLabelStyle}>Channel</span>
          <input
            style={inputStyle}
            placeholder="#channel"
            value={slackChannel}
            onChange={e => setSlackChannel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') updateSetting('slackChannel', slackChannel) }}
          />
          <button style={saveBtnStyle} onClick={() => updateSetting('slackChannel', slackChannel)}>Save</button>
        </div>

        <div style={rowStyle}>
          <span style={fieldLabelStyle}>Member ID</span>
          <input
            style={inputStyle}
            placeholder="U0123456"
            value={slackUserId}
            onChange={e => setSlackUserId(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') updateSetting('slackUserId', slackUserId) }}
          />
          <button style={saveBtnStyle} onClick={() => updateSetting('slackUserId', slackUserId)}>Save</button>
        </div>

        <div style={dividerStyle} />

        {/* TIMER */}
        <div style={sectionLabelStyle}>Timer</div>

        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Keep tasks until manually removed
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Tasks stay on the timer until you remove them instead of being cleaned up automatically.
            </div>
          </div>
          <Toggle
            on={settings?.manualTimerCleanup ?? false}
            onToggle={() => updateSetting('manualTimerCleanup', !(settings?.manualTimerCleanup ?? false))}
          />
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'var(--bg-btn-subtle)', border: '1px solid var(--border-btn)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', margin: '6px 14px' }}
        >
          Sign out
        </button>

      </div>
    </div>
  )
}
