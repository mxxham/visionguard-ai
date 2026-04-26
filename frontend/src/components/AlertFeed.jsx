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
const SEV_ORDER = ['critical', 'moderate', 'low']
const SEV_LABEL = { critical: 'Critical', moderate: 'Moderate', low: 'Low' }

function fmtTime(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) } catch { return '–' }
}

function AlertRowSkeleton() {
  return (
    <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className="shimmer" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="shimmer" style={{ height: 13, width: '55%', borderRadius: 6 }} />
        <div className="shimmer" style={{ height: 11, width: '75%', borderRadius: 6 }} />
        <div className="shimmer" style={{ height: 18, width: 64, borderRadius: 6 }} />
      </div>
      <div className="shimmer" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
    </div>
  )
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

function SeverityHeader({ sev, count }) {
  const color = SEV_COLOR[sev]
  const bg = SEV_BG[sev]
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 2,
      padding: '7px 18px',
      background: bg,
      borderBottom: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color,
          boxShadow: sev === 'critical' ? `0 0 5px ${color}` : 'none' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          {SEV_LABEL[sev]}
        </span>
      </div>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
        background: color, color: '#fff', padding: '1px 8px', borderRadius: 10 }}>
        {count}
      </span>
    </div>
  )
}

function AlertRow({ alert, isNew, setSelected }) {
  const det = alert.detection
  if (!det) return null
  const conf = Math.round((det.confidence ?? 0) * 100)
  const isCrit = det.severity === 'critical'

  return (
    <div
      onClick={() => setSelected(alert)}
      style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
        cursor: 'pointer', transition: 'background 0.12s',
        background: isCrit ? 'rgba(220,38,38,0.03)' : 'transparent',
        animation: isNew ? 'slide-in 0.3s ease-out' : 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = isCrit ? 'rgba(220,38,38,0.03)' : 'transparent'}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
        background: SEV_COLOR[det.severity] || 'var(--muted)',
        boxShadow: isCrit ? '0 0 6px var(--critical)' : 'none',
        animation: isCrit ? 'pulse 2s infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          {det.species} detected
          {isNew && isCrit && (
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 800,
              background: 'var(--critical)', color: '#fff',
              padding: '2px 6px', borderRadius: 4, letterSpacing: '0.06em',
              animation: 'pulse 1.5s infinite',
            }}>NEW</span>
          )}
          {alert.acknowledged && (
            <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ ACK</span>
          )}
          {alert.dispatched && (
            <span style={{ fontSize: 11, color: 'var(--moderate)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>↑ SENT</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {det.camera_name} · {det.camera_zone} · {fmtTime(det.timestamp)}
        </div>
      </div>
      <ConfRing value={conf} sev={det.severity} />
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

  // Group by severity
  const grouped = SEV_ORDER.reduce((acc, sev) => {
    const items = alerts.filter(a => a.detection?.severity === sev)
    if (items.length) acc[sev] = items
    return acc
  }, {})

  const critCount = grouped.critical?.length ?? 0
  const modCount  = grouped.moderate?.length ?? 0
  const lowCount  = grouped.low?.length ?? 0

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      maxHeight: 480, boxShadow: 'var(--shadow)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Live Alerts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {critCount > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, background: 'var(--critical)', color: '#fff', padding: '2px 7px', borderRadius: 8 }}>{critCount} crit</span>}
          {modCount > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, background: 'var(--moderate)', color: '#fff', padding: '2px 7px', borderRadius: 8 }}>{modCount} mod</span>}
          {lowCount > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, background: 'var(--low)', color: '#fff', padding: '2px 7px', borderRadius: 8 }}>{lowCount} low</span>}
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>{fmtTime(lastUpdated)}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {alertsLoading && alerts.length === 0 ? (
          <>
            {[0,1,2,3].map(i => <AlertRowSkeleton key={i} />)}
          </>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
            All clear — no alerts
          </div>
        ) : (
          SEV_ORDER.map(sev => {
            const group = grouped[sev]
            if (!group) return null
            return (
              <div key={sev}>
                <SeverityHeader sev={sev} count={group.length} />
                {group.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    isNew={newAlertIds.has(alert.id)}
                    setSelected={setSelected}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}