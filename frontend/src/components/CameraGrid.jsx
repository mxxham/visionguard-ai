import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { getCameras } from '../api/client'

const SEV_COLOR = {
  critical: 'var(--critical)',
  moderate: 'var(--moderate)',
  low:      'var(--low)',
}

function LiveCameraFeed({ camera, latestDetection, onClick }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [imgError, setImgError] = useState(false)
  const intervalRef = useRef(null)
  const hasAlert = !!latestDetection
  const sev = latestDetection?.severity

  useEffect(() => {
    function fetchLatestFrame() {
      if (latestDetection?.frame_path) {
        const filename = latestDetection.frame_path.split('/').pop()
        setImgSrc(`/snapshots/${filename}?t=${Date.now()}`)
        setImgError(false)
      }
    }
    fetchLatestFrame()
    intervalRef.current = setInterval(fetchLatestFrame, 3000)
    return () => clearInterval(intervalRef.current)
  }, [latestDetection?.frame_path])

  const isOnline  = camera.status === 'online'
  const isOffline = camera.status === 'offline'
  const isError   = camera.status === 'error'

  const borderColor = hasAlert ? SEV_COLOR[sev] : 'var(--border)'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#f1f4fb',
        aspectRatio: '16/9',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        transition: 'all 0.15s',
        animation: hasAlert && sev === 'critical' ? 'cam-alert 1.5s ease-in-out infinite' : 'none',
        boxShadow: hasAlert ? `0 0 0 3px ${SEV_COLOR[sev]}20` : 'var(--shadow)',
      }}
      onMouseEnter={e => { if (!hasAlert) { e.currentTarget.style.border = '2px solid var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' } }}
      onMouseLeave={e => { if (!hasAlert) { e.currentTarget.style.border = `2px solid var(--border)`; e.currentTarget.style.boxShadow = 'var(--shadow)' } }}
    >
      {imgSrc && !imgError ? (
        <img
          src={imgSrc}
          alt={camera.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
          <rect width="160" height="90" fill="#f1f4fb" />
          <rect x="0" y="28" width="160" height="2" fill="#e2e6f0" />
          <rect x="0" y="58" width="160" height="2" fill="#e2e6f0" />
          <rect x="10" y="30" width="12" height="28" fill="#e8ebf4" rx="2" />
          <rect x="30" y="30" width="18" height="28" fill="#e8ebf4" rx="2" />
          <rect x="56" y="30" width="14" height="28" fill="#e8ebf4" rx="2" />
          <rect x="78" y="30" width="22" height="28" fill="#e8ebf4" rx="2" />
          <rect x="110" y="30" width="16" height="28" fill="#e8ebf4" rx="2" />
          <rect x="134" y="30" width="18" height="28" fill="#e8ebf4" rx="2" />
          {isOnline && !hasAlert && (
            <text x="80" y="80" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="IBM Plex Mono">
              {isError ? 'NO SIGNAL' : 'AWAITING DETECTION'}
            </text>
          )}
        </svg>
      )}

      {latestDetection && (
        <div style={{
          position: 'absolute',
          left: '30%', top: '25%', width: '38%', height: '50%',
          border: `2px solid ${SEV_COLOR[sev]}`,
          borderRadius: 4,
        }}>
          <div style={{
            background: SEV_COLOR[sev],
            color: '#fff',
            fontSize: 9, fontFamily: 'var(--font-mono)',
            fontWeight: 700, padding: '2px 5px', borderRadius: '2px 2px 0 0',
          }}>
            {latestDetection.label?.toUpperCase()} {Math.round(latestDetection.confidence * 100)}%
          </div>
        </div>
      )}

      {/* Status badge */}
      <div style={{
        position: 'absolute', top: 7, right: 7,
        fontSize: 10, fontFamily: 'var(--font-mono)',
        padding: '3px 7px', borderRadius: 5,
        background: isOffline || isError
          ? 'rgba(148,163,184,0.9)'
          : hasAlert ? `${SEV_COLOR[sev]}cc` : 'rgba(5,150,105,0.9)',
        color: '#fff',
        display: 'flex', alignItems: 'center', gap: 4,
        fontWeight: 600,
      }}>
        {!isOffline && !isError && (
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#fff',
            display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        )}
        {isOffline ? 'OFFLINE' : isError ? 'ERROR' : hasAlert ? 'ALERT' : 'LIVE'}
      </div>

      {/* Camera label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(15,22,35,0.7))',
        padding: '20px 10px 8px',
        fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontWeight: 600,
      }}>
        <span>{camera.name} · {camera.zone}</span>
        {latestDetection && (
          <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>
            {latestDetection.species}
          </span>
        )}
      </div>
    </div>
  )
}

export default function CameraGrid({ fullPage = false }) {
  const cameras       = useStore(s => s.cameras)
  const alerts        = useStore(s => s.alerts)
  const cameraView    = useStore(s => s.cameraView)
  const setCameraView = useStore(s => s.setCameraView)
  const setSelectedAlert = useStore(s => s.setSelectedAlert)
  const [cols, setCols] = useState(3)

  function getLatestDetection(cameraId) {
    const alert = alerts.find(a => a.detection?.camera_id === cameraId && !a.acknowledged)
    return alert?.detection ?? null
  }

  const displayed = cameraView === 'alert'
    ? cameras.filter(c => getLatestDetection(c.id))
    : cameras

  function handleClick(camera) {
    const det = getLatestDetection(camera.id)
    if (!det) return
    const alert = alerts.find(a => a.detection?.id === det.id)
    if (alert) setSelectedAlert(alert)
  }

  const gridContent = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12,
      padding: 16,
    }}>
      {displayed.map(cam => (
        <LiveCameraFeed
          key={cam.id}
          camera={cam}
          latestDetection={getLatestDetection(cam.id)}
          onClick={() => handleClick(cam)}
        />
      ))}
      {displayed.length === 0 && (
        <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          No cameras with active alerts.
        </div>
      )}
    </div>
  )

  const headerStyle = {
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }

  const btnStyle = (active) => ({
    fontSize: 13, padding: '6px 14px', borderRadius: 8,
    border: '1px solid',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--muted)',
    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500,
    transition: 'all 0.12s',
  })

  if (fullPage) {
    return (
      <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Camera Feeds</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{cameras.length} cameras monitored</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setCols(n)} style={btnStyle(cols === n)}>{n} Col</button>
            ))}
            <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            {['all', 'alert'].map(v => (
              <button key={v} onClick={() => setCameraView(v)} style={btnStyle(cameraView === v)}>
                {v === 'all' ? 'All Cameras' : 'Alerts Only'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          {gridContent}
        </div>
      </main>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Camera Feeds</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{cameras.length} cameras active</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'alert'].map(v => (
            <button key={v} onClick={() => setCameraView(v)} style={btnStyle(cameraView === v)}>
              {v === 'all' ? 'All Cameras' : 'Alerts Only'}
            </button>
          ))}
        </div>
      </div>
      {cameras.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>◫</div>
          No cameras configured. Add cameras in Settings.
        </div>
      ) : gridContent}
    </div>
  )
}
