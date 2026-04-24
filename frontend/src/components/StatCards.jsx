import { useStore } from '../store'

function StatCard({ type, label, value, sub }) {
  const configs = {
    critical: { color: 'var(--critical)', bg: 'var(--critical-dim)', icon: '🔴' },
    moderate: { color: 'var(--moderate)', bg: 'var(--moderate-dim)', icon: '🟠' },
    low:      { color: 'var(--low)',      bg: 'var(--low-dim)',      icon: '🔵' },
    ok:       { color: '#059669',         bg: 'var(--green-dim, rgba(5,150,105,0.08))', icon: '🟢' },
  }
  const cfg = configs[type] || configs.ok

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: cfg.color, borderRadius: '14px 14px 0 0',
      }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 12, color: 'var(--muted)',
          letterSpacing: '0.05em', textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          {label}
        </div>
        <div style={{
          width: 36, height: 36,
          background: cfg.bg,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {cfg.icon}
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 36,
        fontWeight: 700, lineHeight: 1, color: cfg.color,
        letterSpacing: '-0.02em',
      }}>
        {value ?? '–'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, fontWeight: 500 }}>
        {sub}
      </div>
    </div>
  )
}

export default function StatCards() {
  const stats  = useStore(s => s.stats)
  const alerts = useStore(s => s.alerts)

  const critAlerts = alerts.filter(a => a.detection?.severity === 'critical' && !a.acknowledged)
  const critZone = critAlerts[0]?.detection?.camera_zone?.split('–')[0]?.trim() ?? 'None'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
    }}>
      <StatCard
        type="critical"
        label="Critical Alerts"
        value={stats?.critical_count ?? critAlerts.length}
        sub={`Snake detected · ${critZone}`}
      />
      <StatCard
        type="moderate"
        label="Moderate Alerts"
        value={stats?.moderate_count ?? alerts.filter(a => a.detection?.severity === 'moderate' && !a.acknowledged).length}
        sub="Cat / pest activity"
      />
      <StatCard
        type="low"
        label="Low Alerts"
        value={stats?.low_count ?? alerts.filter(a => a.detection?.severity === 'low').length}
        sub="Gecko / other sightings"
      />
      <StatCard
        type="ok"
        label="Cameras Online"
        value={stats ? `${stats.cameras_online}/${stats.cameras_total}` : '–'}
        sub={`${stats?.dedup_suppressed ?? 0} alerts suppressed`}
      />
    </div>
  )
}
