import { useStore } from '../store'

const NAV = [
  { section: 'Monitor', items: [
    { key: 'dashboard', icon: '⬡', label: 'Dashboard' },
    { key: 'cameras',   icon: '◫', label: 'Camera Feeds' },
    { key: 'alerts',    icon: '⚠', label: 'Alerts', badgeKey: 'critical' },
  ]},
  { section: 'Analysis', items: [
    { key: 'incidents', icon: '◈', label: 'Incident Log' },
    { key: 'analytics', icon: '▤', label: 'Analytics' },
  ]},
  { section: 'Settings', items: [
    { key: 'cams-cfg',  icon: '◯', label: 'Cameras', badgeKey: 'cameras' },
    { key: 'model',     icon: '⬡', label: 'Model Config' },
    { key: 'notifs',    icon: '◫', label: 'Notifications' },
  ]},
]

export default function Sidebar() {
  const activePage  = useStore(s => s.activePage)
  const setPage     = useStore(s => s.setActivePage)
  const stats       = useStore(s => s.stats)
  const alerts      = useStore(s => s.alerts)

  const criticalCount = stats?.critical_count ?? alerts.filter(a => a.detection?.severity === 'critical' && !a.acknowledged).length
  const camerasOnline = stats?.cameras_online ?? 0

  function getBadge(key) {
    if (key === 'critical' && criticalCount > 0) return criticalCount
    if (key === 'cameras' && camerasOnline > 0) return camerasOnline
    return null
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: '20px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      overflowY: 'auto',
    }}>
      {NAV.map(({ section, items }) => (
        <div key={section}>
          <div style={{
            padding: '6px 16px 4px',
            fontSize: 10, letterSpacing: '0.12em',
            color: 'var(--muted)', textTransform: 'uppercase',
            fontWeight: 600, marginTop: 8,
          }}>
            {section}
          </div>
          {items.map(({ key, icon, label, badgeKey }) => {
            const badge = badgeKey ? getBadge(badgeKey) : null
            const isActive = activePage === key
            return (
              <div
                key={key}
                onClick={() => setPage(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  fontSize: 13,
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.15s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' } }}
              >
                <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge !== null && (
                  <span style={{
                    background: badgeKey === 'cameras' ? 'var(--moderate)' : 'var(--critical)',
                    color: '#fff', fontSize: 10,
                    padding: '1px 6px', borderRadius: 10, fontWeight: 700,
                  }}>
                    {badge}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Model info card */}
      <div style={{ marginTop: 'auto', padding: 16 }}>
        <div style={{
          background: 'var(--surface2)', borderRadius: 8,
          padding: 12, fontSize: 11,
        }}>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Model</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 10 }}>YOLOv8-nano</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>
            TensorRT · Jetson Nano
          </div>
          <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', width: `${stats?.model_map ?? 87}%`, background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            {stats?.model_map ?? 87.2}% mAP@0.5
          </div>
        </div>
      </div>
    </nav>
  )
}
