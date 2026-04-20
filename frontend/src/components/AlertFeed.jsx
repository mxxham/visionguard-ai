import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../store'

const SEV_COLOR = {
  critical: 'var(--critical)',
  moderate: 'var(--moderate)',
  low:      'var(--low)',
}

function fmtTime(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) }
  catch { return '–' }
}

function ConfRing({ value, sev }) {
  const r = 18, circ = 2 * Math.PI * r
  const fill = circ - (value / 100) * circ
  const color = SEV_COLOR[sev] || 'var(--accent)'
  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} width="44" height="44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border2)" strokeWidth="2.5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color }}>
        {value}%
      </div>
    </div>
  )
}

export default function AlertFeed() {
  const alerts        = useStore(s => s.alerts)
  const newAlertIds   = useStore(s => s.newAlertIds)
  const alertsLoading = useStore(s => s.alertsLoading)
  const setSelected   = useStore(s => s.setSelectedAlert)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => { setLastUpdated(new Date()) }, [alerts.length])

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 480 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Live Alerts</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{fmtTime(lastUpdated)}</span>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {alertsLoading && alerts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No alerts – all clear ✓</div>
        ) : alerts.map((alert) => {
          const det = alert.detection
          if (!det) return null
          const isNew = newAlertIds.has(alert.id)
          const conf = Math.round((det.confidence ?? 0) * 100)
          return (
            <div key={alert.id} onClick={() => setSelected(alert)}
              style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s', animation: isNew ? 'slide-in 0.3s ease-out' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: SEV_COLOR[det.severity] || 'var(--muted)', boxShadow: det.severity === 'critical' ? '0 0 6px var(--critical)' : 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                  {det.severity === 'critical' ? '⚠ ' : ''}{det.species} detected
                  {alert.acknowledged && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>✓ ACK</span>}
                  {alert.dispatched && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--moderate)', fontFamily: 'var(--font-mono)' }}>↑ SENT</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {det.camera_name} · {det.camera_zone} · {fmtTime(det.timestamp)}
                </div>
              </div>
              <ConfRing value={conf} sev={det.severity} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
