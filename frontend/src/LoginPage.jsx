import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const SEV_COLOR = { critical: '#dc2626', moderate: '#d97706', low: '#2563eb' }
const SEV_LABEL = { critical: 'CRITICAL', moderate: 'MODERATE', low: 'LOW' }

// Fetches cameras + live frames + recent alerts without auth
async function fetchPreviewData() {
  try {
    const [camsRes, alertsRes] = await Promise.all([
      fetch('/api/cameras/'),
      fetch('/api/alerts/?limit=20'),
    ])
    const cameras = camsRes.ok ? await camsRes.json() : []
    const alerts  = alertsRes.ok ? await alertsRes.json() : []
    return { cameras, alerts }
  } catch {
    return { cameras: [], alerts: [] }
  }
}

function LiveCell({ camera, alert, active, onClick }) {
  const [src, setSrc] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef(null)
  const hasDetection = !!alert?.detection

  useEffect(() => {
    let cancelled = false

    function load() {
      // Prefer the real detection snapshot, fall back to live thumbnail
      const url = hasDetection && alert.detection.frame_path
        ? `/snapshots/${alert.detection.frame_path.split('/').pop()}?t=${Date.now()}`
        : `/snapshots/live_cam_${camera.id}.jpg?t=${Date.now()}`

      const img = new Image()
      img.onload = () => {
        if (!cancelled) { setSrc(url); setLoaded(true) }
      }
      img.onerror = () => {
        // Try live thumbnail as fallback
        if (!cancelled && alert?.detection?.frame_path) {
          const fb = `/snapshots/live_cam_${camera.id}.jpg?t=${Date.now()}`
          const fbi = new Image()
          fbi.onload = () => { if (!cancelled) { setSrc(fb); setLoaded(true) } }
          fbi.src = fb
        }
      }
      img.src = url
    }

    load()
    timerRef.current = setInterval(load, hasDetection ? 5000 : 2000)
    return () => { cancelled = true; clearInterval(timerRef.current) }
  }, [camera.id, alert?.detection?.frame_path, hasDetection])

  const sev = alert?.detection?.severity
  const borderColor = hasDetection ? SEV_COLOR[sev] : active ? '#2563eb' : '#1e2a3a'

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', aspectRatio: '16/9', borderRadius: 6,
        overflow: 'hidden', cursor: 'pointer',
        border: `2px solid ${borderColor}`,
        boxShadow: hasDetection ? `0 0 14px ${SEV_COLOR[sev]}50` : active ? '0 0 10px #2563eb40' : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        background: '#060c16',
      }}
    >
      {/* Frame image */}
      {src && (
        <img
          src={src}
          alt={camera.name}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />
      )}

      {/* Dark shelf placeholder while loading */}
      {!loaded && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
          <rect width="160" height="90" fill="#060c16" />
          <rect x="0" y="60" width="160" height="30" fill="#0d1520" />
          <rect x="5"   y="22" width="20" height="38" fill="#141e2e" rx="1" />
          <rect x="32"  y="16" width="25" height="44" fill="#141e2e" rx="1" />
          <rect x="64"  y="20" width="22" height="40" fill="#141e2e" rx="1" />
          <rect x="93"  y="18" width="27" height="42" fill="#141e2e" rx="1" />
          <rect x="127" y="23" width="20" height="37" fill="#141e2e" rx="1" />
          {[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88].map(y => (
            <rect key={y} x="0" y={y} width="160" height="1" fill="#000" opacity="0.3" />
          ))}
        </svg>
      )}

      {/* Scan line animation */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
      }} />

      {/* Detection bounding box overlay */}
      {hasDetection && alert.detection.bbox && (() => {
        const [bx, by, bw, bh] = alert.detection.bbox
        // bbox is in original frame coords (640×360), scale to display
        const scaleX = 100 / 640, scaleY = 100 / 360
        return (
          <div style={{
            position: 'absolute',
            left: `${bx * scaleX}%`, top: `${by * scaleY}%`,
            width: `${bw * scaleX}%`, height: `${bh * scaleY}%`,
            border: `1.5px solid ${SEV_COLOR[sev]}`,
            borderRadius: 2,
            animation: 'bbox-blink 1.4s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute', top: -16, left: -1,
              background: SEV_COLOR[sev], color: '#fff',
              fontSize: 7, fontFamily: 'monospace', fontWeight: 700,
              padding: '1px 5px', borderRadius: '2px 2px 0 0',
              whiteSpace: 'nowrap',
            }}>
              {alert.detection.species?.toUpperCase()} {Math.round((alert.detection.confidence ?? 0) * 100)}%
            </div>
          </div>
        )
      })()}

      {/* LIVE / ALERT badge */}
      <div style={{
        position: 'absolute', top: 5, right: 5,
        fontSize: 7, fontFamily: 'monospace', fontWeight: 700,
        padding: '2px 6px', borderRadius: 3,
        background: hasDetection ? `${SEV_COLOR[sev]}dd` : 'rgba(5,150,105,0.85)',
        color: '#fff', display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        {hasDetection ? SEV_LABEL[sev] : 'LIVE'}
      </div>

      {/* Camera label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        padding: '12px 6px 4px',
        fontSize: 7, fontFamily: 'monospace', color: '#94a3b8', fontWeight: 600,
      }}>
        {camera.name} · {camera.zone}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [cameras, setCameras]   = useState([])
  const [alerts, setAlerts]     = useState([])
  const [activeCell, setActiveCell] = useState(0)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load real camera + alert data on mount
  useEffect(() => {
    fetchPreviewData().then(({ cameras, alerts }) => {
      setCameras(cameras.slice(0, 4))
      setAlerts(alerts)
      setDataLoaded(true)
    })
  }, [])

  // Auto-cycle active cell every 4s
  useEffect(() => {
    const t = setInterval(() => setActiveCell(c => (c + 1) % 4), 4000)
    return () => clearInterval(t)
  }, [])

  // Find the most recent unacknowledged alert for each camera
  function alertForCamera(camera) {
    return alerts.find(a => a.detection?.camera_id === camera.id && !a.acknowledged) ?? null
  }

  // Summary counts
  const critCount = alerts.filter(a => a.detection?.severity === 'critical' && !a.acknowledged).length
  const modCount  = alerts.filter(a => a.detection?.severity === 'moderate' && !a.acknowledged).length

  async function handleSubmit(e) {
    e.preventDefault?.()
    if (!username || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try { await login(username, password) }
    catch (err) { setError(err.message || 'Login failed') }
    finally { setLoading(false) }
  }

  // Pick the 4 cells: prefer cameras with alerts, fill rest with any camera
  const alertCams = cameras.filter(c => alertForCamera(c))
  const otherCams = cameras.filter(c => !alertForCamera(c))
  const displayCams = [...alertCams, ...otherCams].slice(0, 4)
  // Pad to 4 if we have fewer than 4 cameras yet
  while (displayCams.length < 4) displayCams.push(null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Left: Live camera preview panel ── */}
      <div style={{
        flex: '0 0 52%', background: '#060c16',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>⬡</div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '0.1em' }}>VISIONGUARD AI</div>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: "'IBM Plex Mono', monospace" }}>LIVE MONITORING</div>
              </div>
            </div>
            {/* Live alert summary pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              {critCount > 0 && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, background: '#dc2626', color: '#fff', padding: '3px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
                  {critCount} CRITICAL
                </div>
              )}
              {modCount > 0 && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, background: '#d97706', color: '#fff', padding: '3px 8px', borderRadius: 10 }}>
                  {modCount} MOD
                </div>
              )}
              {critCount === 0 && modCount === 0 && dataLoaded && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.15)', padding: '3px 8px', borderRadius: 10, border: '1px solid rgba(5,150,105,0.3)' }}>
                  ● ALL CLEAR
                </div>
              )}
            </div>
          </div>

          {/* 2×2 camera grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
            {displayCams.map((cam, i) =>
              cam ? (
                <LiveCell
                  key={cam.id}
                  camera={cam}
                  alert={alertForCamera(cam)}
                  active={activeCell === i}
                  onClick={() => setActiveCell(i)}
                />
              ) : (
                <div key={i} style={{
                  aspectRatio: '16/9', borderRadius: 6, background: '#0a0f18',
                  border: '2px solid #1e2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#1e3a5f' }}>NO FEED</span>
                </div>
              )
            )}
          </div>

          {/* Bottom status bar */}
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(14,22,38,0.9)', borderRadius: 8,
            border: '1px solid #1e2a40',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569' }}>
                {cameras.length} CAMERAS ONLINE
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                [cameras.length, 'CAMERAS'],
                [alerts.length, 'ALERTS'],
              ].map(([val, lbl]) => (
                <div key={lbl} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{val}</div>
                  <div style={{ fontSize: 8, color: '#334155', fontFamily: 'monospace' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div style={{
        flex: 1, background: '#f5f6fa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, padding: '0 40px' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f1623', marginBottom: 6 }}>Welcome back</div>
            <div style={{ fontSize: 14, color: '#6b7592' }}>Sign in to your security console</div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '11px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 15 }}>⚠</span>
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3752', marginBottom: 7 }}>Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                placeholder="Enter your username" autoComplete="username"
                style={{ width: '100%', padding: '11px 14px', background: '#fff', border: '1.5px solid #e2e6f0', borderRadius: 10, fontSize: 14, color: '#0f1623', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e2e6f0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3752', marginBottom: 7 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter your password" autoComplete="current-password"
                  style={{ width: '100%', padding: '11px 44px 11px 14px', background: '#fff', border: '1.5px solid #e2e6f0', borderRadius: 10, fontSize: 14, color: '#0f1623', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e6f0'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7592', fontSize: 16, padding: 4 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!loading) e.target.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)' }}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </div>

          <div style={{ marginTop: 24, padding: '13px 15px', background: '#fff', borderRadius: 10, border: '1px solid #e2e6f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Access Levels</div>
            {[
              { role: 'Admin', color: '#2563eb', desc: 'Full system control — cameras, model, users' },
              { role: 'User',  color: '#059669', desc: 'Monitor alerts, acknowledge & dispatch' },
            ].map(({ role, color, desc }) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 5, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' }}>{role}</span>
                <span style={{ fontSize: 12, color: '#6b7592' }}>{desc}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
            VisionGuard AI · Warehouse Security System
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes bbox-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
      `}</style>
    </div>
  )
}