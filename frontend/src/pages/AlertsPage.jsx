import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { useStore } from '../store'
import { acknowledgeAlert, dispatchAlert } from '../api/client'

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
  try { return format(new Date(ts), 'MMM d, HH:mm:ss') } catch { return '–' }
}
function fmtRel(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) } catch { return '–' }
}

export default function AlertsPage() {
  const alerts       = useStore(s => s.alerts)
  const updateAlert  = useStore(s => s.updateAlert)
  const setSelected  = useStore(s => s.setSelectedAlert)
  const [filter, setFilter]   = useState('all')    // all | critical | moderate | low | unacked
  const [loading, setLoading] = useState({})

  const filtered = alerts.filter(a => {
    const det = a.detection
    if (!det) return false
    if (filter === 'unacked') return !a.acknowledged
    if (filter === 'critical') return det.severity === 'critical'
    if (filter === 'moderate') return det.severity === 'moderate'
    if (filter === 'low')      return det.severity === 'low'
    return true
  })

  async function handleAck(e, alertId) {
    e.stopPropagation()
    setLoading(l => ({ ...l, [alertId]: true }))
    try {
      const res = await acknowledgeAlert(alertId, { acknowledged_by: 'Operator' })
      updateAlert(alertId, { acknowledged: true, acknowledged_by: 'Operator', acknowledged_at: res.data.acknowledged_at })
    } catch (err) { console.error(err) }
    finally { setLoading(l => ({ ...l, [alertId]: false })) }
  }

  async function handleDispatch(e, alertId) {
    e.stopPropagation()
    setLoading(l => ({ ...l, [alertId]: true }))
    try {
      await dispatchAlert(alertId, { notes: 'Dispatched from dashboard' })
      updateAlert(alertId, { dispatched: true })
    } catch (err) { console.error(err) }
    finally { setLoading(l => ({ ...l, [alertId]: false })) }
  }

  const counts = {
    all:      alerts.length,
    unacked:  alerts.filter(a => !a.acknowledged).length,
    critical: alerts.filter(a => a.detection?.severity === 'critical').length,
    moderate: alerts.filter(a => a.detection?.severity === 'moderate').length,
    low:      alerts.filter(a => a.detection?.severity === 'low').length,
  }

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Alert Management
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {filtered.length} alerts
        </span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { key: 'all',      label: 'All' },
          { key: 'unacked',  label: 'Unresolved', color: 'var(--critical)' },
          { key: 'critical', label: 'Critical',   color: 'var(--critical)' },
          { key: 'moderate', label: 'Moderate',   color: 'var(--moderate)' },
          { key: 'low',      label: 'Low',        color: 'var(--low)' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${filter === key ? (color || 'var(--accent)') : 'var(--border2)'}`,
            background: filter === key ? (color ? `${color}20` : 'var(--accent-dim)') : 'transparent',
            color: filter === key ? (color || 'var(--accent)') : 'var(--muted)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {label}
            <span style={{
              background: filter === key ? (color || 'var(--accent)') : 'var(--border2)',
              color: filter === key ? '#000' : 'var(--muted)',
              fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 700,
            }}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Alerts table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 140px 100px 90px 90px 180px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: 10, color: 'var(--muted)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          <span>Severity</span>
          <span>Detection</span>
          <span>Camera / Zone</span>
          <span>Confidence</span>
          <span>Status</span>
          <span>Dispatched</span>
          <span>Time</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No alerts match the current filter.
          </div>
        ) : filtered.map(alert => {
          const det = alert.detection
          if (!det) return null
          const sev = det.severity
          const color = SEV_COLOR[sev]
          const conf = Math.round((det.confidence ?? 0) * 100)
          const isLoading = loading[alert.id]

          return (
            <div
              key={alert.id}
              onClick={() => setSelected(alert)}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 140px 100px 90px 90px 180px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                alignItems: 'center',
                transition: 'background 0.15s',
                opacity: alert.acknowledged ? 0.6 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Severity */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontFamily: 'var(--font-mono)',
                color, fontWeight: 700,
                background: SEV_BG[sev], padding: '2px 7px', borderRadius: 4,
                width: 'fit-content',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {sev?.toUpperCase()}
              </span>

              {/* Species */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                  {det.species}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  ID #{alert.id}
                </div>
              </div>

              {/* Camera */}
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                <div>{det.camera_name}</div>
                <div style={{ fontSize: 10 }}>{det.camera_zone}</div>
              </div>

              {/* Confidence bar */}
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, marginBottom: 3 }}>{conf}%</div>
                <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, width: 60 }}>
                  <div style={{ height: '100%', width: `${conf}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>

              {/* Acknowledged */}
              <div>
                {alert.acknowledged ? (
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>✓ Acked</span>
                ) : (
                  <button
                    onClick={e => handleAck(e, alert.id)}
                    disabled={isLoading}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 4,
                      border: '1px solid var(--border2)', background: 'transparent',
                      color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {isLoading ? '…' : 'Ack'}
                  </button>
                )}
              </div>

              {/* Dispatched */}
              <div>
                {alert.dispatched ? (
                  <span style={{ fontSize: 10, color: 'var(--moderate)', fontFamily: 'var(--font-mono)' }}>↑ Sent</span>
                ) : (
                  <button
                    onClick={e => handleDispatch(e, alert.id)}
                    disabled={isLoading}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 4,
                      border: '1px solid var(--border2)', background: 'transparent',
                      color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {isLoading ? '…' : 'Send'}
                  </button>
                )}
              </div>

              {/* Time */}
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                <div>{fmtRel(det.timestamp)}</div>
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{fmtTime(det.timestamp)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}