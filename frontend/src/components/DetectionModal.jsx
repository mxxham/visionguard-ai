import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../store'
import { acknowledgeAlert, dispatchAlert } from '../api/client'

const SEV_COLOR = { critical: 'var(--critical)', moderate: 'var(--moderate)', low: 'var(--low)' }

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
        background: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fade-in 0.15s ease-out',
      }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 12,
        width: 500,
        maxWidth: '92vw',
        overflow: 'hidden',
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color }}>
            {sev?.toUpperCase()}: {det?.species} · {det?.camera_name}
          </span>
          <span
            onClick={() => setSelected(null)}
            style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}
          >✕</span>
        </div>

        <div style={{ padding: 20 }}>
          {/* Snapshot area */}
          <div style={{
            background: 'var(--surface2)',
            borderRadius: 8,
            aspectRatio: '16/9',
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
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
                <rect width="320" height="180" fill="#111318" />
                <rect x="0" y="60" width="320" height="8" fill="#1a1e25" />
                <rect x="0" y="120" width="320" height="8" fill="#1a1e25" />
                <rect x="40" y="68" width="20" height="52" fill="#181c22" />
                <rect x="80" y="68" width="30" height="52" fill="#181c22" />
                <rect x="130" y="68" width="25" height="52" fill="#181c22" />
                <rect x="200" y="68" width="35" height="52" fill="#181c22" />
                <rect x="260" y="68" width="20" height="52" fill="#181c22" />
                <rect x="55" y="100" width="60" height="50" fill="none" stroke={color} strokeWidth="2" />
                <rect x="55" y="100" width="50" height="12" fill={color} />
                <text x="58" y="109" fill={sev === 'moderate' ? '#000' : '#fff'} fontSize="7" fontFamily="Space Mono" fontWeight="700">
                  {det?.label}
                </text>
              </svg>
            )}
            <div style={{
              position: 'absolute', top: 8, right: 8,
              fontFamily: 'var(--font-mono)', fontSize: 9, color: '#fff',
              background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 2,
            }}>
              {det?.camera_name} · {det?.camera_zone}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              ['Species',     det?.species],
              ['Threat Level', <span style={{ color }}>{sev?.toUpperCase()}</span>],
              ['Camera',      det?.camera_name],
              ['Zone',        det?.camera_zone],
              ['Confidence',  `${conf}%`],
              ['Detected',    fmtTime(det?.timestamp)],
              ['Status',      selectedAlert.acknowledged ? '✓ Acknowledged' : 'Unresolved'],
              ['Dispatched',  selectedAlert.dispatched ? '✓ Yes' : 'No'],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{val ?? '–'}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDispatch}
              disabled={loading || selectedAlert.dispatched}
              style={{
                padding: '8px 16px',
                background: selectedAlert.dispatched ? 'var(--border2)' : 'var(--accent)',
                color: selectedAlert.dispatched ? 'var(--muted)' : '#000',
                border: 'none', borderRadius: 6,
                fontWeight: 600, cursor: selectedAlert.dispatched ? 'not-allowed' : 'pointer',
                fontSize: 13, fontFamily: 'var(--font-sans)',
              }}
            >
              {selectedAlert.dispatched ? 'Dispatched' : 'Dispatch Response'}
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={loading || selectedAlert.acknowledged}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: selectedAlert.acknowledged ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border2)',
                borderRadius: 6, cursor: selectedAlert.acknowledged ? 'not-allowed' : 'pointer',
                fontSize: 13, fontFamily: 'var(--font-sans)',
              }}
            >
              {selectedAlert.acknowledged ? '✓ Acknowledged' : 'Acknowledge'}
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{
                padding: '8px 16px', background: 'transparent',
                color: 'var(--muted)', border: '1px solid var(--border2)',
                borderRadius: 6, cursor: 'pointer',
                fontSize: 13, fontFamily: 'var(--font-sans)',
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
