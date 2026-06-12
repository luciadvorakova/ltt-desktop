import { useState, useEffect, useRef, type ReactNode } from 'react'

document.documentElement.setAttribute('data-theme', 'dark')

const DIGISMOOTHIE_LOGO_SVG = `<svg width="100%" height="auto" viewBox="0 0 1054 220" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M59.0027 220C84.2804 220 104.773 199.499 104.773 174.211C104.773 148.923 84.2813 128.423 59.0027 128.423C33.7241 128.423 13.2324 148.922 13.2324 174.211C13.2324 199.5 33.7241 220 59.0027 220Z" fill="white"/><path d="M59.0004 118.048C91.5859 118.048 118.001 91.6225 118.001 59.0237C118.001 26.4249 91.5859 0 59.0004 0C26.4149 0 0 26.4257 0 59.0246C0 91.6234 26.4149 118.048 59.0004 118.048Z" fill="white"/><path d="M206.847 143.943H185.481V75.5526H205.681C229.896 75.5526 239.866 85.2856 239.866 108.904C239.866 131.615 230.414 143.943 206.847 143.943ZM208.142 59.3309H168V160.165H208.142C239.866 160.165 258.642 140.829 258.642 108.904C258.642 76.9801 242.974 59.3309 208.142 59.3309ZM270.167 81.2626V160.165H287.648V81.2626H270.167ZM386.836 81.2626V160.165H404.317V81.2626H386.836ZM454.3 113.576C439.409 110.851 436.042 107.088 436.042 101.507C436.042 96.7057 441.999 93.4614 450.027 93.4614C457.408 93.4614 465.048 97.3546 465.048 104.233H482.399C482.399 90.4766 471.652 79.1863 450.286 79.1863C429.309 79.1863 418.95 88.2704 418.95 102.546C418.95 115.523 426.201 122.66 447.178 126.943C462.846 129.668 467.249 132.783 467.249 139.012C467.249 144.462 460.386 148.096 450.804 148.096C439.797 148.096 433.064 141.867 433.064 134.6H415.583C415.583 150.302 425.813 162.371 451.063 162.371C473.594 162.371 484.73 152.898 484.73 138.233C484.73 125.775 477.608 117.989 454.3 113.576ZM668.734 146.149C653.713 146.149 647.109 136.676 647.109 120.325C647.109 104.103 654.231 95.408 668.734 95.408C683.366 95.408 690.488 104.103 690.488 120.325C690.488 136.676 683.625 146.149 668.734 146.149ZM668.993 79.1863C644.39 79.1863 628.981 94.4996 628.981 120.584C628.981 146.409 643.613 162.371 668.993 162.371C693.855 162.371 708.617 146.409 708.617 120.584C708.617 94.4996 693.078 79.1863 668.993 79.1863ZM756.398 146.149C741.248 146.149 734.514 136.676 734.514 120.325C734.514 104.103 741.636 95.408 756.398 95.408C771.03 95.408 777.893 104.103 777.893 120.325C777.893 136.676 771.289 146.149 756.398 146.149ZM756.527 79.1863C732.054 79.1863 716.386 94.4996 716.386 120.584C716.386 146.409 731.148 162.371 756.527 162.371C781.519 162.371 796.022 146.409 796.022 120.584C796.022 94.4996 780.612 79.1863 756.527 79.1863ZM829.041 81.2626V59.3309H811.56V81.2626H799.906V95.5377H811.56V136.157C811.56 150.821 818.294 162.371 835.516 162.371C842.249 162.371 846.134 161.593 850.795 160.295V143.424C847.17 144.462 843.674 145.371 839.789 145.371C831.89 145.371 829.041 141.348 829.041 133.561V95.5377H850.795V81.2626H829.041ZM949.725 81.2626V160.165H967.206V81.2626H949.725ZM1037.26 112.798H995.564C997.118 102.546 1005.41 95.408 1015.76 95.408C1029.88 95.408 1036.74 102.546 1037.26 112.798ZM1053.45 127.073C1056.17 106.049 1049.69 79.1863 1015.76 79.1863C994.399 79.1863 979.378 94.8889 979.378 121.622C979.378 148.096 994.399 162.241 1015.76 162.241C1038.42 162.241 1048.14 150.302 1052.41 137.065H1036.61C1033.76 142.905 1026.25 146.02 1015.76 146.02C1005.92 146.02 996.6 139.012 995.435 127.073H1053.45ZM958.53 51.0254C952.833 51.0254 948.301 55.5675 948.301 61.2775C948.301 66.9875 952.833 71.3999 958.53 71.3999C964.228 71.3999 968.63 66.9875 968.63 61.2775C968.63 55.5675 964.228 51.0254 958.53 51.0254ZM326.883 176.626C320.02 176.626 313.915 173.272 313.915 167.432C313.915 161.161 319.651 158.089 327.012 158.089H345.011C352.91 158.089 358.627 160.165 358.627 167.432C358.627 173.272 352.91 176.626 344.882 176.626C342.163 176.626 329.602 176.626 326.883 176.626ZM334.911 95.5377C347.342 95.5377 353.428 100.599 353.428 109.034C353.428 117.469 348.119 122.531 335.041 122.531C322.092 122.531 317.301 117.469 317.301 109.034C317.301 100.858 322.351 95.5377 334.911 95.5377ZM349.026 145.89L325.459 146.02C321.315 146.02 319.114 143.165 319.114 140.699C319.114 138.752 320.02 135.897 322.998 134.081C326.495 134.989 330.509 135.508 334.911 135.508C356.924 135.508 368.06 126.294 368.06 110.072C368.06 102.546 361.845 97.095 358.09 95.5377H373.499C374.146 95.5377 374.794 94.4996 374.794 93.7209V81.2626H335.688C313.934 81.2626 301.115 90.8659 301.115 108.775C301.115 118.248 306.165 125.515 313.805 130.058C308.884 133.951 304.352 139.012 304.352 144.852C304.352 148.875 305.906 151.081 307.589 154.585C304.093 157.18 299.043 161.593 299.043 169.509C299.043 179.242 307.589 188.975 324.293 188.975C332.451 188.975 340.868 188.975 349.026 188.975C363.399 188.975 373.887 179.372 373.887 167.432C373.887 154.675 363.01 145.76 349.026 145.89ZM906.217 79.1863C893.138 79.1863 884.722 85.9345 882.002 92.8125V55.9568H864.521V160.165H882.002V115.393C882.002 103.584 889.772 95.5377 902.073 95.5377C912.562 95.5377 916.835 102.546 916.835 112.149V160.165H934.316V107.347C934.316 90.217 922.403 79.1863 906.217 79.1863ZM619.14 107.347C619.14 95.1484 612.018 79.1863 590.911 79.1863C574.336 79.1863 567.603 88.4002 564.495 95.9271C559.575 81.2626 544.942 79.1863 537.173 79.1863C529.533 79.1863 516.066 85.1559 513.088 94.7591V81.2626H495.607V160.165H513.088V113.706C513.088 103.584 520.987 95.5377 532.9 95.5377C543.648 95.5377 549.475 102.546 549.475 113.706V160.165H566.956V113.706C566.956 103.584 574.336 95.5377 586.767 95.5377C597.385 95.5377 601.659 103.973 601.659 113.706V160.165H619.14V107.347ZM395.642 51.0254C389.944 51.0254 385.412 55.5675 385.412 61.2775C385.412 66.9875 389.944 71.3999 395.642 71.3999C401.339 71.3999 405.742 66.9875 405.742 61.2775C405.742 55.5675 401.339 51.0254 395.642 51.0254ZM278.972 51.0254C273.275 51.0254 268.742 55.5675 268.742 61.2775C268.742 66.9875 273.275 71.3999 278.972 71.3999C284.67 71.3999 289.072 66.9875 289.072 61.2775C289.072 55.5675 284.67 51.0254 278.972 51.0254Z" fill="white"/></svg>`
import { useAuth } from './hooks/useAuth'
import { useNotifications } from './hooks/useNotifications'
import { useLtt } from './hooks/useLtt'
import { useTheme } from './hooks/useTheme'
import { TimerView } from './components/TimerView'
import { HistoryView } from './components/HistoryView'
import { WeeklyView } from './components/WeeklyView'
import { SettingsView } from './components/SettingsView'

type Tab = 'timer' | 'history' | 'weekly'

interface Session {
  access_token: string
  refresh_token: string
}

function getInitials(accessToken: string): string {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    const fullName: string = payload.user_metadata?.full_name ?? ''
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts[0]?.length >= 1) return parts[0].slice(0, 2).toUpperCase()
  } catch { /* ignore */ }
  return 'LD'
}

function getUserInfo(accessToken: string): { name: string; email: string } {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    return {
      name: payload.user_metadata?.full_name ?? payload.email ?? '',
      email: payload.email ?? '',
    }
  } catch { /* ignore */ }
  return { name: '', email: '' }
}

function AppShell({ session, signOut }: { session: Session; signOut: () => Promise<void> }) {
  const ltt = useLtt()
  useTheme()
  const [tab, setTab] = useState<Tab>('timer')
  const [timerResetKey, setTimerResetKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [standupOpen, setStandupOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  const initials = getInitials(session.access_token)
  const { name: _name, email: _email } = getUserInfo(session.access_token)

  const { notifications, dismissNotification, notificationCount } = useNotifications({
    onJiraConnect: () => ltt.jiraSignIn(),
    onGcalConnect: () => ltt.gcalSignIn(),
    onOpenStandup: () => { setSettingsOpen(false); setStandupOpen(true) },
  })

  useEffect(() => {
    if (!navOpen) return
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [navOpen])

  const [titleHovered, setTitleHovered] = useState(false)
  const tabLabel: Record<Tab, string> = { timer: 'Timer', history: 'History', weekly: 'Weekly' }

  const navItems: { t: Tab; icon: ReactNode }[] = [
    {
      t: 'timer',
      icon: <span style={{ fontSize: 8, lineHeight: 1 }}>▶</span>,
    },
    {
      t: 'history',
      icon: <span style={{ fontSize: 11, lineHeight: 1 }}>≡</span>,
    },
    {
      t: 'weekly',
      icon: (
        <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, width: 7, height: 7 }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ width: 2.5, height: 2.5, borderRadius: 0.5, background: 'currentColor', display: 'block' }} />
          ))}
        </span>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'inherit', position: 'relative', zIndex: 1 }}>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)' }}>

        {/* View title */}
        {tab === 'timer' ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-header)' }}>
            Timer
          </span>
        ) : (
          <div
            onClick={() => setTab('timer')}
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: titleHovered ? 0.7 : 1 }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>‹</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-header)' }}>{tabLabel[tab]}</span>
          </div>
        )}

        {/* Right: avatar + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Avatar with notification badge */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--bg-btn-subtle)',
                border: '1px solid var(--border-btn)',
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              {initials}
            </button>
            {notificationCount > 0 && (
              <div style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#e05252',
                border: '2px solid var(--notif-badge-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 7,
                fontWeight: 700,
                color: 'white',
                pointerEvents: 'none',
              }}>
                {notificationCount}
              </div>
            )}
          </div>

          {/* Hamburger + dropdown */}
          <div ref={navRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNavOpen(o => !o)}
              style={{ background: 'none', border: 'none', padding: 3, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3.5, alignItems: 'center', justifyContent: 'center' }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: 'block', width: 14, height: 1.5, background: 'var(--text-muted)', borderRadius: 2 }} />
              ))}
            </button>

            {navOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-card)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-dropdown)',
                minWidth: 130,
                padding: '4px 0',
                zIndex: 200,
              }}>
                {navItems.map(({ t, icon }) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (t === 'timer' && tab === 'timer') setTimerResetKey(k => k + 1)
                      setTab(t)
                      setSettingsOpen(false)
                      setNavOpen(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      fontWeight: tab === t ? 600 : 400,
                      color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textAlign: 'left',
                    }}
                  >
                    {icon}
                    {tabLabel[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'timer' && <TimerView key={timerResetKey} standupOpen={standupOpen} onStandupClose={() => setStandupOpen(false)} />}
        {tab === 'history' && <HistoryView />}
        {tab === 'weekly' && <WeeklyView />}
        {settingsOpen && (
          <SettingsView
            onClose={() => setSettingsOpen(false)}
            notifications={notifications}
            dismissNotification={dismissNotification}
            signOut={signOut}
          />
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { session, loading, signIn, signOut } = useAuth()

  useEffect(() => {
    if (!session) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [session])

  if (loading) {
    return (
      <div style={{ alignItems: 'center', display: 'flex', height: '100vh', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ background: 'var(--bg-card)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 320, padding: '40px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 160, marginBottom: 28, opacity: 0.92 }} dangerouslySetInnerHTML={{ __html: DIGISMOOTHIE_LOGO_SVG }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Agency Time Tracker
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7, marginBottom: 32 }}>
            Your hours will log themselves. Almost.<br />
            <span style={{ color: 'var(--text-muted)' }}>— LD</span>
          </div>
          <button
            onClick={signIn}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center', background: 'white', border: 'none', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Sign in with Google</span>
          </button>
        </div>
      </div>
    )
  }

  return <AppShell session={session} signOut={signOut} />
}
