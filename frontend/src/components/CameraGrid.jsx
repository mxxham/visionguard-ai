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
  const bgColor = sev === 'critical' ? '#110a0a' : sev === 'moderate' ? '#0d0d08' : '#0d0f13'

  // Poll for latest snapshot from this camera
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

  return (
    <div
      onClick={onClick}
      style={{
        background: bgColor,
        aspectRatio: '16/9',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.2s',
        animation: hasAlert && sev === 'critical' ? 'cam-alert 1.5s ease-in-out infinite' : 'none',
        outline: hasAlert && sev !== 'critical' ? `2px solid ${SEV_COLOR[sev]}` : undefined,
      }}
      onMouseEnter={e => { if (!hasAlert) e.currentTarget.style.outline = '2px solid var(--accent)' }}
      onMouseLeave={e => { if (!hasAlert) e.currentTarget.style.outline = 'none' }}
    >
      {/* Live snapshot or placeholder */}
      {imgSrc && !imgError ? (
        <img
          src={imgSrc}
          alt={camera.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <>
          {/* Shelf placeholder SVG */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
            <rect width="160" height="90" fill={bgColor} />
            <rect x="0" y="28" width="160" height="3" fill="#1a1e25" />
            <rect x="0" y="58" width="160" height="3" fill="#1a1e25" />
            <rect x="10" y="31" width="12" height="27" fill="#13161b" />
            <rect x="30" y="31" width="18" height="27" fill="#13161b" />
            <rect x="56" y="31" width="14" height="27" fill="#13161b" />
            <rect x="78" y="31" width="22" height="27" fill="#13161b" />
            <rect x="110" y="31" width="16" height="27" fill="#13161b" />
            <rect x="134" y="31" width="18" height="27" fill="#13161b" />
            <rect x="0" y="61" width="160" height="29" fill="#111318" />
            {isOnline && !hasAlert && (
              <text x="80" y="80" textAnchor="middle" fill="#6b7380" fontSize="7" fontFamily="Space Mono">
                {isError ? 'NO SIGNAL' : 'AWAITING DETECTION'}
              </text>
            )}
          </svg>
        </>
      )}

      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,229,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      {/* Detection bounding box overlay */}
      {latestDetection && (
        <div style={{
          position: 'absolute',
          left: '30%', top: '35%', width: '38%', height: '42%',
          border: `2px solid ${SEV_COLOR[sev]}`,
          borderRadius: 3,
          animation: sev === 'critical' ? 'fade-in 0.3s ease-out' : 'none',
        }}>
          <div style={{
            background: SEV_COLOR[sev],
            color: sev === 'moderate' ? '#000' : '#fff',
            fontSize: 8, fontFamily: 'var(--font-mono)',
            fontWeight: 700, padding: '1px 4px',
          }}>
            {latestDetection.label?.toUpperCase()} {Math.round(latestDetection.confidence * 100)}%
          </div>
        </div>
      )}

      {/* Status badge */}
      <div style={{
        position: 'absolute', top: 6, right: 6,
        fontSize: 9, fontFamily: 'var(--font-mono)',
        padding: '2px 6px', borderRadius: 3,
        background: isOffline || isError
          ? 'rgba(107,115,128,0.2)'
          : hasAlert ? 'rgba(255,68,68,0.15)' : 'rgba(0,229,160,0.15)',
        color: isOffline || isError
          ? 'var(--muted)'
          : hasAlert ? 'var(--critical)' : 'var(--accent)',
        border: `1px solid ${isOffline || isError ? 'rgba(107,115,128,0.3)' : hasAlert ? 'rgba(255,68,68,0.4)' : 'rgba(0,229,160,0.3)'}`,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {!isOffline && !isError && (
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: hasAlert ? 'var(--critical)' : 'var(--accent)',
            display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        )}
        {isOffline ? 'OFFLINE' : isError ? 'ERROR' : hasAlert ? 'ALERT' : 'LIVE'}
      </div>

      {/* Camera label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        padding: '16px 8px 6px',
        fontSize: 10, fontFamily: 'var(--font-mono)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{camera.name} · {camera.zone}</span>
        {latestDetection && (
          <span style={{ color: SEV_COLOR[sev], fontSize: 9 }}>
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
    const alert = alerts.find(
      a => a.detection?.camera_id === cameraId && !a.acknowledged
    )
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
      gap: 1,
      background: 'var(--border)',
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
        <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No cameras with active alerts.
        </div>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Camera Feeds
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setCols(n)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 5,
                border: '1px solid var(--border2)',
                background: cols === n ? 'var(--accent-dim)' : 'transparent',
                color: cols === n ? 'var(--accent)' : 'var(--muted)',
                borderColor: cols === n ? 'var(--accent)' : 'var(--border2)',
                cursor: 'pointer',
              }}>{n} Col</button>
            ))}
            <div style={{ width: 1, background: 'var(--border2)', margin: '0 4px' }} />
            {['all', 'alert'].map(v => (
              <button key={v} onClick={() => setCameraView(v)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 5,
                border: '1px solid var(--border2)',
                background: cameraView === v ? 'var(--accent-dim)' : 'transparent',
                color: cameraView === v ? 'var(--accent)' : 'var(--muted)',
                borderColor: cameraView === v ? 'var(--accent)' : 'var(--border2)',
                cursor: 'pointer',
              }}>{v === 'all' ? 'All Cams' : 'Alerts Only'}</button>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {gridContent}
        </div>
      </main>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Camera Feeds
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'alert'].map(v => (
            <button key={v} onClick={() => setCameraView(v)} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 5,
              border: '1px solid var(--border2)',
              background: cameraView === v ? 'var(--accent-dim)' : 'transparent',
              color: cameraView === v ? 'var(--accent)' : 'var(--muted)',
              borderColor: cameraView === v ? 'var(--accent)' : 'var(--border2)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              {v === 'all' ? 'All Cams' : 'Alerts Only'}
            </button>
          ))}
        </div>
      </div>
      {cameras.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>◫</div>
          No cameras configured. Add cameras in Settings.
        </div>
      ) : gridContent}
    </div>
  )
}