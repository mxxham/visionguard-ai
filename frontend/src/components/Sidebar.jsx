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
  { section: 'Settings', adminOnly: true, items: [
    { key: 'cams-cfg',  icon: '◯', label: 'Cameras', badgeKey: 'cameras', adminOnly: true },
    { key: 'model',     icon: '⬡', label: 'Model Config', adminOnly: true },
    { key: 'notifs',    icon: '◫', label: 'Notifications', adminOnly: true },
    { key: 'users',     icon: '👤', label: 'Users', adminOnly: true },
  ]},
]

export default function Sidebar({ isAdmin = false }) {
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
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      padding: '16px 0', display: 'flex', flexDirection: 'column',
      gap: 1, overflowY: 'auto',
    }}>
      {NAV.map(({ section, items, adminOnly: sectionAdminOnly }) => {
        // Hide entire Settings section from non-admins
        if (sectionAdminOnly && !isAdmin) return null
        const visibleItems = items.filter(i => !i.adminOnly || isAdmin)
        if (visibleItems.length === 0) return null

        return (
          <div key={section} style={{ marginBottom: 8 }}>
            <div style={{
              padding: '8px 20px 5px', fontSize: 11, letterSpacing: '0.1em',
              color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 4,
            }}>
              {section}
            </div>
            {visibleItems.map(({ key, icon, label, badgeKey }) => {
              const badge = badgeKey ? getBadge(badgeKey) : null
              const isActive = activePage === key
              return (
                <div key={key} onClick={() => setPage(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 20px', fontSize: 14, fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  cursor: 'pointer', borderRadius: '0 10px 10px 0', marginRight: 12,
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.12s', userSelect: 'none', position: 'relative',
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' }}}
                >
                  {isActive && (
                    <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />
                  )}
                  <span style={{ width: 18, textAlign: 'center', fontSize: 15 }}>{icon}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge !== null && (
                    <span style={{ background: badgeKey === 'cameras' ? 'var(--moderate)' : 'var(--critical)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 700, lineHeight: 1.5 }}>
                      {badge}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Current user info at bottom */}
      <div style={{ marginTop: 'auto', padding: '16px 16px 12px' }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)', fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Signed in</div>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>
            Role: <span style={{ color: isAdmin ? 'var(--accent)' : '#059669', fontWeight: 700 }}>
              {isAdmin ? 'Admin' : 'Operator'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
