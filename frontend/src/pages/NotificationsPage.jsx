import { useState } from 'react'

const toggleStyle = (on) => ({
  width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
  background: on ? 'var(--accent)' : 'var(--border2)', transition: 'background 0.2s',
  flexShrink: 0,
})

const knobStyle = (on) => ({
  position: 'absolute', top: 3, left: on ? 18 : 3, width: 14, height: 14,
  borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
})

function Toggle({ on, onChange }) {
  return (
    <div style={toggleStyle(on)} onClick={() => onChange(!on)}>
      <div style={knobStyle(on)} />
    </div>
  )
}

function NotifRow({ label, sub, on, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState({
    criticalPush:   true,
    moderatePush:   true,
    lowPush:        false,
    emailCritical:  true,
    emailSummary:   false,
    soundAlerts:    true,
    browserNotifs:  false,
    slackWebhook:   false,
  })

  const [webhookUrl, setWebhookUrl] = useState('')
  const [emailAddr, setEmailAddr]   = useState('')
  const [saved, setSaved] = useState(false)

  function toggle(key) {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'var(--surface2)', border: '1px solid var(--border2)',
    borderRadius: 6, color: 'var(--text)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none', marginTop: 8,
  }

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Notifications
      </h2>

      {/* In-app alerts */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          In-App Alerts
        </div>
        <NotifRow label="Critical alert notifications" sub="Snake and high-severity detections" on={settings.criticalPush} onChange={() => toggle('criticalPush')} />
        <NotifRow label="Moderate alert notifications" sub="Cat, pest, and medium-severity detections" on={settings.moderatePush} onChange={() => toggle('moderatePush')} />
        <NotifRow label="Low alert notifications" sub="Gecko and low-severity detections" on={settings.lowPush} onChange={() => toggle('lowPush')} />
        <NotifRow label="Sound alerts" sub="Play audio when critical alert fires" on={settings.soundAlerts} onChange={() => toggle('soundAlerts')} />
      </div>

      {/* Email */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Email Notifications
        </div>
        <NotifRow label="Email on critical alerts" sub="Send immediate email for critical detections" on={settings.emailCritical} onChange={() => toggle('emailCritical')} />
        <NotifRow label="Daily summary email" sub="Send end-of-day detection summary" on={settings.emailSummary} onChange={() => toggle('emailSummary')} />
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Email Address
          </label>
          <input
            value={emailAddr}
            onChange={e => setEmailAddr(e.target.value)}
            placeholder="alerts@yourcompany.com"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Slack */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Slack Integration
        </div>
        <NotifRow label="Slack webhook notifications" sub="Post detections to a Slack channel" on={settings.slackWebhook} onChange={() => toggle('slackWebhook')} />
        {settings.slackWebhook && (
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Webhook URL
            </label>
            <input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              style={inputStyle}
            />
          </div>
        )}
      </div>

      {/* Browser notifications */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Browser
        </div>
        <NotifRow label="Browser push notifications" sub="Native OS notifications when tab is in background" on={settings.browserNotifs} onChange={() => toggle('browserNotifs')} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} style={{
          padding: '8px 20px',
          background: saved ? 'var(--accent-dim)' : 'var(--accent)',
          border: saved ? '1px solid var(--accent)' : 'none',
          color: saved ? 'var(--accent)' : '#000',
          borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          transition: 'all 0.2s',
        }}>
          {saved ? '✓ Saved' : 'Save Preferences'}
        </button>
      </div>
    </main>
  )
}