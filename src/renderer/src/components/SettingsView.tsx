import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ width: 36, height: 20, borderRadius: 99, background: on ? 'rgba(80,180,100,0.7)' : 'rgba(255,255,255,0.15)', border: `1px solid ${on ? 'rgba(80,180,100,0.9)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
    >
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'left 0.2s' }} />
    </div>
  )
}

const sectionLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', padding: '12px 14px 6px' }
const blockStyle: React.CSSProperties = { margin: '0 14px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }
const rowBorderedStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }
const rowLabelStyle: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.8)' }
const rowSubStyle: React.CSSProperties = { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }
const inputStyle: React.CSSProperties = { flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 8px', fontSize: 11, color: 'white', fontFamily: 'inherit', outline: 'none' }
const saveBtnStyle: React.CSSProperties = { fontSize: 10, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
const connectBtnStyle: React.CSSProperties = { fontSize: 10, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
const disconnectBtnStyle: React.CSSProperties = { fontSize: 10, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit' }
const connectedStyle: React.CSSProperties = { fontSize: 10, color: '#7fd89a', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export function SettingsView({ onClose }: { onClose: () => void }) {
  const { settings, updateSetting } = useSettings()
  const [slackChannel, setSlackChannel] = useState('')
  const [slackUserId, setSlackUserId] = useState('')

  useEffect(() => {
    if (settings) {
      setSlackChannel(settings.slackChannel ?? '')
      setSlackUserId(settings.slackUserId ?? '')
    }
  }, [settings])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #1e1850 0%, #0e1830 100%)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
        >
          ‹
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Settings</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* CONNECTIONS */}
        <div style={sectionLabelStyle}>Connections</div>
        <div style={blockStyle}>

          {/* Jira */}
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <div style={rowLabelStyle}>Jira</div>
              {!settings?.jiraUserName && <div style={rowSubStyle}>Search issues and log time directly.</div>}
            </div>
            {settings?.jiraUserName ? (
              <>
                <span style={connectedStyle}>✓ {settings.jiraUserName}</span>
                <button style={disconnectBtnStyle} onClick={() => updateSetting('jiraUserName', undefined)}>
                  Disconnect
                </button>
              </>
            ) : (
              <button style={connectBtnStyle}>Connect</button>
            )}
          </div>

          {/* Google Calendar */}
          <div style={rowBorderedStyle}>
            <div style={{ flex: 1 }}>
              <div style={rowLabelStyle}>Google Calendar</div>
              {!settings?.gcalEmail && <div style={rowSubStyle}>Import events as time entries.</div>}
            </div>
            {settings?.gcalEmail ? (
              <>
                <span style={connectedStyle}>✓ {settings.gcalEmail}</span>
                <button style={disconnectBtnStyle} onClick={() => updateSetting('gcalEmail', undefined)}>
                  Disconnect
                </button>
              </>
            ) : (
              <button style={connectBtnStyle}>Connect</button>
            )}
          </div>

        </div>

        {/* SLACK STANDUP */}
        <div style={sectionLabelStyle}>Slack standup</div>
        <div style={blockStyle}>

          {/* Channel */}
          <div style={rowStyle}>
            <input
              style={inputStyle}
              placeholder="#channel"
              value={slackChannel}
              onChange={e => setSlackChannel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') updateSetting('slackChannel', slackChannel) }}
            />
            <button style={saveBtnStyle} onClick={() => updateSetting('slackChannel', slackChannel)}>
              Save
            </button>
          </div>

          {/* Member ID */}
          <div style={rowBorderedStyle}>
            <input
              style={inputStyle}
              placeholder="Member ID"
              value={slackUserId}
              onChange={e => setSlackUserId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') updateSetting('slackUserId', slackUserId) }}
            />
            <button style={saveBtnStyle} onClick={() => updateSetting('slackUserId', slackUserId)}>
              Save
            </button>
          </div>

        </div>

        {/* TIMER */}
        <div style={sectionLabelStyle}>Timer</div>
        <div style={blockStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
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
    </div>
  )
}
