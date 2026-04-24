import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../store'

const SEV_COLOR = {
  critical: 'var(--critical)',
  moderate: 'var(--moderate)',
  low:      'var(--low)',
}
const SEV_BG = {
  critical: 'var(--critical-dim)',
  moderate: 'var(--moderate-dim)',
  low:      'var(--low-dim)',
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
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border2)" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color, fontWeight: 600 }}>
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
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', display: 'flex',
      flexDirection: 'column', maxHeight: 480,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Live Alerts</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          {fmtTime(lastUpdated)}
        </span>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {alertsLoading && alerts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
            All clear — no alerts
          </div>
        ) : alerts.map((alert) => {
          const det = alert.detection
          if (!det) return null
          const isNew = newAlertIds.has(alert.id)
          const conf = Math.round((det.confidence ?? 0) * 100)
          return (
            <div key={alert.id} onClick={() => setSelected(alert)}
              style={{
                padding: '13px 18px', borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                cursor: 'pointer', transition: 'background 0.12s',
                animation: isNew ? 'slide-in 0.3s ease-out' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                background: SEV_COLOR[det.severity] || 'var(--muted)',
                boxShadow: det.severity === 'critical' ? '0 0 6px var(--critical)' : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  {det.species} detected
                  {alert.acknowledged && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ ACK</span>
                  )}
                  {alert.dispatched && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--moderate)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>↑ SENT</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {det.camera_name} · {det.camera_zone} · {fmtTime(det.timestamp)}
                </div>
                <div style={{
                  marginTop: 5,
                  display: 'inline-block',
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 6,
                  background: SEV_BG[det.severity] || 'var(--accent-dim)',
                  color: SEV_COLOR[det.severity] || 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {det.severity}
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
