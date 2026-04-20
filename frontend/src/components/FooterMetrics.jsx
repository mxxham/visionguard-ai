import { useStore } from '../store'

function FooterCard({ label, value, sub, progress, progressColor = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
      {progress !== undefined && (
        <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, marginTop: 8 }}>
          <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progressColor, borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}

export default function FooterMetrics() {
  const stats  = useStore(s => s.stats)
  const alerts = useStore(s => s.alerts)

  const total  = stats?.total_today ?? alerts.length
  const dedup  = stats?.dedup_suppressed ?? 0
  const mapVal = stats?.model_map ?? 87.2

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <FooterCard
        label="Detection Precision"
        value={`${mapVal}%`}
        sub={`Target: ≥90% · ${mapVal >= 90 ? 'achieved' : 'improving'}`}
        progress={mapVal}
      />
      <FooterCard
        label="Incidents Today"
        value={total}
        sub="Live count · real-time"
        progress={Math.min((total / 20) * 100, 100)}
        progressColor="var(--moderate)"
      />
      <FooterCard
        label="Dedup Window"
        value="30s"
        sub={`Alert fatigue suppressed: ${dedup}`}
        progress={70}
        progressColor="var(--low)"
      />
    </div>
  )
}
