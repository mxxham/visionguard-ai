import { useStore } from '../store'

const ZONES = [
  { id: 'A', x: 18,  y: 18,  w: 120, h: 80, cx: 78,  cy: 58 },
  { id: 'B', x: 148, y: 18,  w: 134, h: 80, cx: 215, cy: 58 },
  { id: 'C', x: 18,  y: 108, w: 120, h: 74, cx: 78,  cy: 148 },
  { id: 'D', x: 148, y: 108, w: 134, h: 74, cx: 215, cy: 148 },
]

const CAM_POSITIONS = {
  'Zone A': { cx: 48,  cy: 30 },
  'Zone B': { cx: 200, cy: 30 },
  'Zone C': { cx: 48,  cy: 170 },
  'Zone D': { cx: 200, cy: 170 },
}

export default function ZoneMap() {
  const alerts  = useStore(s => s.alerts)

  // Compute zone status from unacknowledged alerts
  const zoneStatus = {}
  alerts.forEach(alert => {
    if (alert.acknowledged) return
    const det = alert.detection
    if (!det) return
    const zone = det.camera_zone?.split('–')[0]?.trim()?.replace('Zone ', '') ?? null
    if (!zone) return
    const sev = det.severity
    if (!zoneStatus[zone] || sev === 'critical') {
      zoneStatus[zone] = sev
    }
  })

  function zoneColor(id) {
    const sev = zoneStatus[id]
    if (sev === 'critical') return '#ff4444'
    if (sev === 'moderate') return '#ffaa00'
    return '#22272f'
  }

  function zoneLabel(id) {
    const sev = zoneStatus[id]
    if (sev === 'critical') return { text: '⚠ SNAKE', color: '#ff4444' }
    if (sev === 'moderate') return { text: 'CAT',     color: '#ffaa00' }
    return { text: 'CLEAR', color: '#6b7380' }
  }

  function camColor(zoneId) {
    const sev = zoneStatus[zoneId]
    if (sev === 'critical') return '#ff4444'
    if (sev === 'moderate') return '#ffaa00'
    return '#22272f'
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
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Zone Map
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <svg viewBox="0 0 300 200" width="100%" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="var(--surface2)" />

          {/* Door indicators */}
          <rect x="128" y="92" width="16" height="4" rx="1" fill="#22272f" stroke="#2d3440" strokeWidth="1" />

          {ZONES.map(z => {
            const color = zoneColor(z.id)
            const lbl = zoneLabel(z.id)
            return (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="3"
                  fill="#1a1e25" stroke={color} strokeWidth="1" />
                <text x={z.cx} y={z.cy - 5} textAnchor="middle"
                  fill={color} fontSize="10" fontFamily="Space Mono">
                  ZONE {z.id}
                </text>
                <text x={z.cx} y={z.cy + 12} textAnchor="middle"
                  fill={lbl.color} fontSize="8" fontFamily="Space Mono">
                  {lbl.text}
                </text>
              </g>
            )
          })}

          {/* Camera dots */}
          {Object.entries(CAM_POSITIONS).map(([zone, pos]) => {
            const id = zone.replace('Zone ', '')
            const color = camColor(id)
            const isAlert = !!zoneStatus[id]
            return (
              <circle key={zone} cx={pos.cx} cy={pos.cy} r="4"
                fill={isAlert ? color : 'var(--surface2)'}
                stroke={isAlert ? color : '#6b7380'} strokeWidth="1"
                opacity={isAlert ? 0.9 : 0.6}
              />
            )
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, fontSize: 10, paddingTop: 8 }}>
          {[
            { color: 'var(--critical)', label: 'Critical' },
            { color: 'var(--moderate)', label: 'Moderate' },
            { color: 'var(--border2)',  label: 'Clear' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, color }}>
              <span style={{ width: 6, height: 6, background: color, borderRadius: '50%', display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
