// ModelConfigPage.jsx
import { useState } from 'react'
import { useStore } from '../store'

export function ModelConfigPage() {
  const stats = useStore(s => s.stats)
  const [confidence, setConfidence] = useState(45)
  const [dedupWindow, setDedupWindow] = useState(30)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sliderStyle = {
    width: '100%', accentColor: 'var(--accent)',
    cursor: 'pointer', height: 4,
  }

  const labelStyle = {
    fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 8, display: 'block',
  }

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Model Configuration
      </h2>

      {/* Model info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
          Active Model
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            ['Architecture', 'YOLOv8-nano'],
            ['Parameters',  '3.0M'],
            ['GFLOPs',      '8.1'],
            ['mAP@0.5',     `${stats?.model_map ?? 87.2}%`],
            ['Framework',   'Ultralytics 8.2.50'],
            ['Device',      'CPU (AMD Ryzen)'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detection settings */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 20 }}>
          Detection Settings
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Confidence Threshold — {confidence}%</label>
            <input type="range" min={10} max={95} value={confidence}
              onChange={e => setConfidence(Number(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              <span>10% (More sensitive)</span><span>95% (More precise)</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Dedup Window — {dedupWindow}s</label>
            <input type="range" min={5} max={300} step={5} value={dedupWindow}
              onChange={e => setDedupWindow(Number(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              <span>5s (More alerts)</span><span>300s (Fewer alerts)</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, padding: 12, background: 'var(--surface2)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          ⚠ Note: Changing these values requires a backend restart to take effect. Update docker-compose.yml environment variables.
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} style={{
            padding: '8px 20px', background: saved ? 'var(--accent-dim)' : 'var(--accent)',
            border: saved ? '1px solid var(--accent)' : 'none',
            color: saved ? 'var(--accent)' : '#000',
            borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s',
          }}>
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Class map */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
          Detection Classes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Snake',  sev: 'CRITICAL', color: 'var(--critical)' },
            { label: 'Cat',    sev: 'MODERATE', color: 'var(--moderate)' },
            { label: 'Dog',    sev: 'MODERATE', color: 'var(--moderate)' },
            { label: 'Gecko',  sev: 'LOW',      color: 'var(--low)' },
            { label: 'Person', sev: 'LOW',      color: 'var(--low)' },
            { label: 'Bird',   sev: 'LOW',      color: 'var(--low)' },
            { label: 'Rat',    sev: 'MODERATE', color: 'var(--moderate)' },
            { label: 'Other',  sev: 'LOW',      color: 'var(--muted)' },
          ].map(({ label, sev, color }) => (
            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12 }}>{label}</span>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{sev}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default ModelConfigPage