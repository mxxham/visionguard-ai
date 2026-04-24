import { useStore } from '../store'

function FooterCard({ label, value, sub, progress, progressColor = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{sub}</div>
      {progress !== undefined && (
        <div style={{ height: 4, background: 'var(--border2)', borderRadius: 3, marginTop: 12 }}>
          <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progressColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      <FooterCard
        label="Detection Precision"
        value={`${mapVal}%`}
        sub={`Target: ≥90% · ${mapVal >= 90 ? 'achieved' : 'improving'}`}
        progress={mapVal}
        progressColor="var(--accent)"
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
