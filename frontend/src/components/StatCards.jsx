import { useStore } from '../store'

function generateSparkline(seed, count = 7) {
  const data = []
  let val = (seed % 10) + 2
  for (let i = 0; i < count; i++) {
    val = Math.max(0, val + ((seed * (i + 1) * 7919) % 7) - 3)
    data.push(Math.round(val))
  }
  return data
}

function Sparkline({ data, color, good = false }) {
  if (!data || data.length < 2) return null
  const w = 72, h = 26
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h * 0.85 - h * 0.075
    return `${x},${y}`
  })
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const trend = last - prev

  const trendColor = trend === 0
    ? 'var(--muted)'
    : good
      ? (trend < 0 ? '#059669' : '#dc2626')
      : (trend > 0 ? '#dc2626' : '#059669')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * w
          const barH = Math.max(2, ((v - min) / range) * h * 0.85)
          return (
            <rect
              key={i}
              x={x - 3} y={h - barH} width={5} height={barH} rx={1.5}
              fill={color} opacity={i === data.length - 1 ? 1 : 0.3}
            />
          )
        })}
        <polyline
          points={pts.join(' ')}
          fill="none" stroke={color} strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round" opacity="0.65"
        />
      </svg>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
        color: trendColor,
      }}>
        {trend > 0 ? '▲' : trend < 0 ? '▼' : '─'}
        {trend !== 0 && <span>{Math.abs(trend)}</span>}
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 22px', position: 'relative',
      overflow: 'hidden', boxShadow: 'var(--shadow)',
    }}>
      <div className="shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="shimmer" style={{ height: 11, width: 88, borderRadius: 6 }} />
        <div className="shimmer" style={{ width: 34, height: 34, borderRadius: 10 }} />
      </div>
      <div className="shimmer" style={{ height: 34, width: 52, borderRadius: 8, marginBottom: 8 }} />
      <div className="shimmer" style={{ height: 11, width: 110, borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: 5, marginTop: 12, alignItems: 'flex-end' }}>
        {[14, 8, 18, 11, 20, 15, 22].map((h, i) => (
          <div key={i} className="shimmer" style={{ width: 5, height: h, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  )
}

function StatCard({ type, label, value, sub, sparkData, good = false }) {
  const configs = {
    critical: { color: 'var(--critical)', bg: 'var(--critical-dim)', icon: '⬡', raw: '#dc2626' },
    moderate: { color: 'var(--moderate)', bg: 'var(--moderate-dim)', icon: '◈', raw: '#d97706' },
    low:      { color: 'var(--low)',      bg: 'var(--low-dim)',      icon: '◇', raw: '#2563eb' },
    ok:       { color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: '◉', raw: '#059669' },
  }
  const cfg = configs[type] || configs.ok

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 22px', position: 'relative',
      overflow: 'hidden', boxShadow: 'var(--shadow)', transition: 'box-shadow 0.2s, transform 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cfg.color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          {label}
        </div>
        <div style={{ width: 34, height: 34, background: cfg.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: cfg.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          {cfg.icon}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, lineHeight: 1, color: cfg.color, letterSpacing: '-0.02em' }}>
        {value ?? '–'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{sub}</div>
      <Sparkline data={sparkData} color={cfg.raw} good={good} />
    </div>
  )
}

export default function StatCards() {
  const stats = useStore(s => s.stats)
  const alerts = useStore(s => s.alerts)
  const alertsLoading = useStore(s => s.alertsLoading)

  const critAlerts = alerts.filter(a => a.detection?.severity === 'critical' && !a.acknowledged)
  const modAlerts  = alerts.filter(a => a.detection?.severity === 'moderate' && !a.acknowledged)
  const lowAlerts  = alerts.filter(a => a.detection?.severity === 'low')
  const critZone   = critAlerts[0]?.detection?.camera_zone?.split('–')[0]?.trim() ?? 'None'

  const critCount  = stats?.critical_count ?? critAlerts.length
  const modCount   = stats?.moderate_count ?? modAlerts.length
  const lowCount   = stats?.low_count ?? lowAlerts.length
  const camsOnline = stats?.cameras_online ?? 0

  const critSpark = generateSparkline(critCount * 31 + 17)
  const modSpark  = generateSparkline(modCount  * 43 + 29)
  const lowSpark  = generateSparkline(lowCount  * 53 + 11)
  const camSpark  = (() => { const s = generateSparkline(camsOnline * 67 + 7); s[s.length-1] = camsOnline; return s })()

  if (alertsLoading && !stats) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[0,1,2,3].map(i => <StatCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <StatCard type="critical" label="Critical Alerts" value={critCount} sub={`Snake detected · ${critZone}`} sparkData={critSpark} good={true} />
      <StatCard type="moderate" label="Moderate Alerts" value={modCount} sub="Cat / pest activity" sparkData={modSpark} good={true} />
      <StatCard type="low" label="Low Alerts" value={lowCount} sub="Gecko / other sightings" sparkData={lowSpark} good={true} />
      <StatCard type="ok" label="Cameras Online" value={stats ? `${stats.cameras_online}/${stats.cameras_total}` : '–'} sub={`${stats?.dedup_suppressed ?? 0} alerts suppressed`} sparkData={camSpark} good={false} />
    </div>
  )
}