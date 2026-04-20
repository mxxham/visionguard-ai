import { useStore } from '../store'

function StatCard({ type, label, value, sub }) {
  const colors = {
    critical: 'var(--critical)',
    moderate: 'var(--moderate)',
    low: 'var(--low)',
    ok: 'var(--accent)',
  }
  const color = colors[type] || 'var(--accent)'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: color,
      }} />
      <div style={{
        fontSize: 11, color: 'var(--muted)',
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 28,
        fontWeight: 700, lineHeight: 1, color,
      }}>
        {value ?? '–'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
        {sub}
      </div>
    </div>
  )
}

export default function StatCards() {
  const stats  = useStore(s => s.stats)
  const alerts = useStore(s => s.alerts)

  // Fall back to computed values from loaded alerts when stats not yet fetched
  const critAlerts = alerts.filter(a => a.detection?.severity === 'critical' && !a.acknowledged)
  const critZone = critAlerts[0]?.detection?.camera_zone?.split('–')[0]?.trim() ?? 'None'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
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
