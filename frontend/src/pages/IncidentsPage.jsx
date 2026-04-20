// IncidentsPage.jsx
import { useState } from 'react'
import { format } from 'date-fns'
import { useStore } from '../store'

const SEV_COLOR = { critical: 'var(--critical)', moderate: 'var(--moderate)', low: 'var(--low)' }

export function IncidentsPage() {
  const alerts  = useStore(s => s.alerts)
  const setSelected = useStore(s => s.setSelectedAlert)
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('all')

  const filtered = alerts.filter(a => {
    const det = a.detection
    if (!det) return false
    const matchSev = sevFilter === 'all' || det.severity === sevFilter
    const matchSearch = !search || 
      det.species?.toLowerCase().includes(search.toLowerCase()) ||
      det.camera_name?.toLowerCase().includes(search.toLowerCase()) ||
      det.camera_zone?.toLowerCase().includes(search.toLowerCase())
    return matchSev && matchSearch
  })

  function fmtTime(ts) {
    try { return format(new Date(ts), 'MMM d yyyy, HH:mm:ss') } catch { return '–' }
  }

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Incident Log
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {filtered.length} incidents
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search species, camera, zone…"
          style={{
            flex: 1, padding: '8px 12px',
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 6, color: 'var(--text)', fontSize: 13,
            fontFamily: 'var(--font-sans)', outline: 'none',
          }}
        />
        {['all', 'critical', 'moderate', 'low'].map(s => (
          <button key={s} onClick={() => setSevFilter(s)} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${sevFilter === s ? (SEV_COLOR[s] || 'var(--accent)') : 'var(--border2)'}`,
            background: sevFilter === s ? `${SEV_COLOR[s] || 'var(--accent)'}20` : 'transparent',
            color: sevFilter === s ? (SEV_COLOR[s] || 'var(--accent)') : 'var(--muted)',
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{s}</button>
        ))}
      </div>

      {/* Incidents table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1fr 150px 120px 90px 80px 80px 160px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          <span>ID</span><span>Species</span><span>Camera</span><span>Zone</span>
          <span>Severity</span><span>Conf</span><span>Dup</span><span>Timestamp</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No incidents found.
          </div>
        ) : filtered.map(alert => {
          const det = alert.detection
          if (!det) return null
          const color = SEV_COLOR[det.severity]
          const conf  = Math.round((det.confidence ?? 0) * 100)
          return (
            <div key={alert.id} onClick={() => setSelected(alert)}
              style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 150px 120px 90px 80px 80px 160px',
                padding: '11px 16px', borderBottom: '1px solid var(--border)',
                alignItems: 'center', cursor: 'pointer', fontSize: 12,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11 }}>#{alert.id}</span>
              <span style={{ fontWeight: 500 }}>{det.species}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{det.camera_name}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{det.camera_zone}</span>
              <span style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{det.severity?.toUpperCase()}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color }}>{conf}%</span>
              <span style={{ fontSize: 10, color: det.is_duplicate ? 'var(--moderate)' : 'var(--muted)' }}>
                {det.is_duplicate ? '⚠ DUP' : '—'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{fmtTime(det.timestamp)}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}

export default IncidentsPage