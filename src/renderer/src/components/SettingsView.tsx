import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useLtt } from '../hooks/useLtt'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ width: 28, height: 16, borderRadius: 99, background: on ? 'rgba(80,180,100,0.7)' : 'rgba(255,255,255,0.15)', border: `1px solid ${on ? 'rgba(80,180,100,0.9)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 14 : 2, transition: 'left 0.2s' }} />
    </div>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }
const sectionLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', padding: '10px 14px 4px' }
const rowLabelStyle: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.8)' }
const rowSubStyle: React.CSSProperties = { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }
const inputStyle: React.CSSProperties = { flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '4px 10px', fontSize: 10, color: 'white', fontFamily: 'inherit', outline: 'none' }
const saveBtnStyle: React.CSSProperties = { fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
const connectBtnStyle: React.CSSProperties = { fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'rgba(80,180,100,0.2)', border: '1px solid rgba(80,180,100,0.35)', color: '#7fd89a', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
const disconnectBtnStyle: React.CSSProperties = { fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
const connectedStyle: React.CSSProperties = { fontSize: 10, color: '#7fd89a', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const fieldLabelStyle: React.CSSProperties = { fontSize: 9, color: 'rgba(255,255,255,0.32)', width: 56, flexShrink: 0 }

export function SettingsView({ onClose: _onClose }: { onClose: () => void }) {
  const { settings, updateSetting } = useSettings()
  const ltt = useLtt()
  const [slackChannel, setSlackChannel] = useState('')
  const [slackUserId, setSlackUserId] = useState('')
  const [jiraStatus, setJiraStatus] = useState<{ connected: boolean; email?: string; cloudId?: string }>({ connected: false })

  useEffect(() => {
    if (settings) {
      setSlackChannel(settings.slackChannel ?? '')
      setSlackUserId(settings.slackUserId ?? '')
    }
  }, [settings])

  useEffect(() => {
    ltt.jiraGetStatus().then(setJiraStatus)
    const handler = () => ltt.jiraGetStatus().then(setJiraStatus)
    ltt.on('jira-auth-success', handler)
    return () => ltt.off('jira-auth-success', handler)
  }, [ltt])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #1e1850 0%, #0e1830 100%)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', minHeight: 34, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
          Settings
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* CONNECTIONS */}
        <div style={sectionLabelStyle}>Connections</div>

        {/* Jira */}
        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <div style={rowLabelStyle}>Jira</div>
            {!jiraStatus.connected && <div style={rowSubStyle}>Search issues and log time directly.</div>}
          </div>
          {jiraStatus.connected ? (
            <>
              <span style={connectedStyle}>✓ {jiraStatus.email}</span>
              <button style={disconnectBtnStyle} onClick={() => { ltt.jiraSignOut(); setJiraStatus({ connected: false }) }}>Disconnect</button>
            </>
          ) : (
            <button style={connectBtnStyle} onClick={() => ltt.jiraSignIn()}>Connect</button>
          )}
        </div>

        {/* Google Calendar — last in section */}
        <div style={{ ...rowStyle }}>
          <div style={{ flex: 1 }}>
            <div style={rowLabelStyle}>Google Calendar</div>
            {!settings?.gcalEmail && <div style={rowSubStyle}>Import events as time entries.</div>}
          </div>
          {settings?.gcalEmail ? (
            <>
              <span style={connectedStyle}>✓ {settings.gcalEmail}</span>
              <button style={disconnectBtnStyle} onClick={() => updateSetting('gcalEmail', undefined)}>Disconnect</button>
            </>
          ) : (
            <button style={connectBtnStyle}>Connect</button>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

        {/* SLACK STANDUP */}
        <div style={sectionLabelStyle}>Slack standup</div>

        {/* Channel */}
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

        {/* Member ID — last in section */}
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

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

        {/* TIMER */}
        <div style={sectionLabelStyle}>Timer</div>

        {/* Keep tasks toggle */}
        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
              Keep tasks until manually removed
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
              Tasks stay on the timer until you remove them instead of being cleaned up automatically.
            </div>
          </div>
          <Toggle
            on={settings?.manualTimerCleanup ?? false}
            onToggle={() => updateSetting('manualTimerCleanup', !(settings?.manualTimerCleanup ?? false))}
          />
        </div>

      </div>
    </div>
  )
}
