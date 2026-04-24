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
    if (sev === 'critical') return '#dc2626'
    if (sev === 'moderate') return '#d97706'
    return '#e2e6f0'
  }

  function zoneFill(id) {
    const sev = zoneStatus[id]
    if (sev === 'critical') return 'rgba(220,38,38,0.06)'
    if (sev === 'moderate') return 'rgba(217,119,6,0.06)'
    return '#f8f9fc'
  }

  function zoneLabel(id) {
    const sev = zoneStatus[id]
    if (sev === 'critical') return { text: '⚠ SNAKE', color: '#dc2626' }
    if (sev === 'moderate') return { text: 'CAT',     color: '#d97706' }
    return { text: 'CLEAR', color: '#94a3b8' }
  }

  function camColor(zoneId) {
    const sev = zoneStatus[zoneId]
    if (sev === 'critical') return '#dc2626'
    if (sev === 'moderate') return '#d97706'
    return '#94a3b8'
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Zone Map</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Warehouse overview</div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <svg viewBox="0 0 300 200" width="100%" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#f8f9fc" rx="6" />

          <rect x="128" y="92" width="16" height="4" rx="2" fill="#cbd5e1" />

          {ZONES.map(z => {
            const color = zoneColor(z.id)
            const fill = zoneFill(z.id)
            const lbl = zoneLabel(z.id)
            return (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="6"
                  fill={fill} stroke={color} strokeWidth="1.5" />
                <text x={z.cx} y={z.cy - 5} textAnchor="middle"
                  fill="#64748b" fontSize="10" fontFamily="IBM Plex Mono" fontWeight="600">
                  ZONE {z.id}
                </text>
                <text x={z.cx} y={z.cy + 12} textAnchor="middle"
                  fill={lbl.color} fontSize="9" fontFamily="IBM Plex Mono" fontWeight="600">
                  {lbl.text}
                </text>
              </g>
            )
          })}

          {Object.entries(CAM_POSITIONS).map(([zone, pos]) => {
            const id = zone.replace('Zone ', '')
            const color = camColor(id)
            const isAlert = !!zoneStatus[id]
            return (
              <circle key={zone} cx={pos.cx} cy={pos.cy} r="5"
                fill={isAlert ? color : '#ffffff'}
                stroke={isAlert ? color : '#cbd5e1'} strokeWidth="1.5"
              />
            )
          })}
        </svg>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, paddingTop: 10 }}>
          {[
            { color: 'var(--critical)', label: 'Critical' },
            { color: 'var(--moderate)', label: 'Moderate' },
            { color: 'var(--border2)',  label: 'Clear' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)', fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, background: color, borderRadius: '50%', display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
