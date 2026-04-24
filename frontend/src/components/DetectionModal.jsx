import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../store'
import { acknowledgeAlert, dispatchAlert } from '../api/client'

const SEV_COLOR = { critical: 'var(--critical)', moderate: 'var(--moderate)', low: 'var(--low)' }
const SEV_BG = { critical: 'var(--critical-dim)', moderate: 'var(--moderate-dim)', low: 'var(--low-dim)' }

function fmtTime(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) } catch { return '–' }
}

export default function DetectionModal() {
  const selectedAlert  = useStore(s => s.selectedAlert)
  const setSelected    = useStore(s => s.setSelectedAlert)
  const updateAlert    = useStore(s => s.updateAlert)
  const [loading, setLoading] = useState(false)

  if (!selectedAlert) return null

  const det = selectedAlert.detection
  const sev = det?.severity
  const color = SEV_COLOR[sev] || 'var(--accent)'
  const conf = Math.round((det?.confidence ?? 0) * 100)

  async function handleAcknowledge() {
    setLoading(true)
    try {
      const res = await acknowledgeAlert(selectedAlert.id, { acknowledged_by: 'Operator' })
      updateAlert(selectedAlert.id, { acknowledged: true, acknowledged_by: 'Operator', acknowledged_at: res.data.acknowledged_at })
      setSelected({ ...selectedAlert, acknowledged: true })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleDispatch() {
    setLoading(true)
    try {
      await dispatchAlert(selectedAlert.id, { notes: 'Dispatched from dashboard' })
      updateAlert(selectedAlert.id, { dispatched: true })
      setSelected({ ...selectedAlert, dispatched: true })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,22,35,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fade-in 0.15s ease-out',
      }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: 520,
        maxWidth: '92vw',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: SEV_BG[sev] || 'var(--surface2)',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              {sev} alert
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {det?.species} · {det?.camera_name}
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--surface)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--muted)', border: '1px solid var(--border)',
          }} onClick={() => setSelected(null)}>✕</div>
        </div>

        <div style={{ padding: 22 }}>
          {/* Snapshot area */}
          <div style={{
            background: 'var(--surface2)',
            borderRadius: 10,
            aspectRatio: '16/9',
            marginBottom: 18,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            {det?.frame_path ? (
              <img
                src={`/snapshots/${det.frame_path.split('/').pop()}`}
                alt="Detection snapshot"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none' }}
              />
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 320 180" style={{ position: 'absolute', inset: 0 }}>
                <rect width="320" height="180" fill="#f1f4fb" />
                <rect x="0" y="60" width="320" height="6" fill="#e8ebf4" />
                <rect x="0" y="120" width="320" height="6" fill="#e8ebf4" />
                <rect x="40" y="66" width="20" height="54" fill="#e2e6f0" rx="3" />
                <rect x="80" y="66" width="30" height="54" fill="#e2e6f0" rx="3" />
                <rect x="130" y="66" width="25" height="54" fill="#e2e6f0" rx="3" />
                <rect x="200" y="66" width="35" height="54" fill="#e2e6f0" rx="3" />
                <rect x="260" y="66" width="20" height="54" fill="#e2e6f0" rx="3" />
                <rect x="55" y="100" width="60" height="50" fill="none" stroke={color} strokeWidth="2" rx="3" />
                <rect x="55" y="100" width="52" height="14" fill={color} rx="2" />
                <text x="59" y="111" fill="#fff" fontSize="8" fontFamily="IBM Plex Mono" fontWeight="700">
                  {det?.label}
                </text>
              </svg>
            )}
            <div style={{
              position: 'absolute', top: 8, right: 8,
              fontFamily: 'var(--font-mono)', fontSize: 10, color: '#fff',
              background: 'rgba(15,22,35,0.7)', padding: '3px 8px', borderRadius: 5,
              fontWeight: 500,
            }}>
              {det?.camera_name} · {det?.camera_zone}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              ['Species',     det?.species],
              ['Threat Level', <span style={{ color, fontWeight: 700 }}>{sev?.toUpperCase()}</span>],
              ['Camera',      det?.camera_name],
              ['Zone',        det?.camera_zone],
              ['Confidence',  `${conf}%`],
              ['Detected',    fmtTime(det?.timestamp)],
              ['Status',      selectedAlert.acknowledged ? '✓ Acknowledged' : 'Unresolved'],
              ['Dispatched',  selectedAlert.dispatched ? '✓ Yes' : 'No'],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '11px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontWeight: 700 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{val ?? '–'}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDispatch}
              disabled={loading || selectedAlert.dispatched}
              style={{
                padding: '10px 20px',
                background: selectedAlert.dispatched ? 'var(--surface2)' : 'var(--accent)',
                color: selectedAlert.dispatched ? 'var(--muted)' : '#fff',
                border: '1px solid',
                borderColor: selectedAlert.dispatched ? 'var(--border)' : 'var(--accent)',
                borderRadius: 9,
                fontWeight: 600, cursor: selectedAlert.dispatched ? 'not-allowed' : 'pointer',
                fontSize: 14, fontFamily: 'var(--font-sans)',
                transition: 'all 0.12s',
              }}
            >
              {selectedAlert.dispatched ? '✓ Dispatched' : 'Dispatch Response'}
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={loading || selectedAlert.acknowledged}
              style={{
                padding: '10px 20px',
                background: selectedAlert.acknowledged ? 'rgba(5,150,105,0.08)' : 'transparent',
                color: selectedAlert.acknowledged ? '#059669' : 'var(--text2)',
                border: '1px solid',
                borderColor: selectedAlert.acknowledged ? 'rgba(5,150,105,0.3)' : 'var(--border)',
                borderRadius: 9, cursor: selectedAlert.acknowledged ? 'not-allowed' : 'pointer',
                fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600,
              }}
            >
              {selectedAlert.acknowledged ? '✓ Acknowledged' : 'Acknowledge'}
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{
                padding: '10px 20px', background: 'transparent',
                color: 'var(--muted)', border: '1px solid var(--border)',
                borderRadius: 9, cursor: 'pointer',
                fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 500,
                marginLeft: 'auto',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
