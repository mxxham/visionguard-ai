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
      padding: '16px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      overflowY: 'auto',
    }}>
      {NAV.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 8 }}>
          <div style={{
            padding: '8px 20px 5px',
            fontSize: 11, letterSpacing: '0.1em',
            color: 'var(--muted)', textTransform: 'uppercase',
            fontWeight: 700, marginTop: 4,
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
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 20px',
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  cursor: 'pointer',
                  borderRadius: '0 10px 10px 0',
                  marginRight: 12,
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.12s',
                  userSelect: 'none',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: 3, background: 'var(--accent)', borderRadius: '0 3px 3px 0',
                  }} />
                )}
                <span style={{ width: 18, textAlign: 'center', fontSize: 15 }}>{icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge !== null && (
                  <span style={{
                    background: badgeKey === 'cameras' ? 'var(--moderate)' : 'var(--critical)',
                    color: '#fff', fontSize: 11,
                    padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                    lineHeight: 1.5,
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
      <div style={{ marginTop: 'auto', padding: '16px 16px 12px' }}>
        <div style={{
          background: 'var(--surface2)', borderRadius: 10,
          padding: 14, fontSize: 12,
          border: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Model</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>YOLOv8-nano</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11, marginTop: 3 }}>
            TensorRT · Jetson Nano
          </div>
          <div style={{ height: 4, background: 'var(--border2)', borderRadius: 3, marginTop: 10 }}>
            <div style={{ height: '100%', width: `${stats?.model_map ?? 87}%`, background: 'var(--accent)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, fontWeight: 500 }}>
            {stats?.model_map ?? 87.2}% mAP@0.5
          </div>
        </div>
      </div>
    </nav>
  )
}
