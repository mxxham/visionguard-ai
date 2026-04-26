// App.jsx - Updated to include auth gate + role-based sidebar hiding
// Replace your existing App.jsx with this

import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import LoginPage       from './LoginPage'
import TopBar          from './components/TopBar'
import Sidebar         from './components/Sidebar'
import StatCards       from './components/StatCards'
import CameraGrid      from './components/CameraGrid'
import AlertFeed       from './components/AlertFeed'
import BarChart        from './components/BarChart'
import ZoneMap         from './components/ZoneMap'
import FooterMetrics   from './components/FooterMetrics'
import DetectionModal  from './components/DetectionModal'
import CamerasPage     from './pages/CamerasPage'
import AlertsPage      from './pages/AlertsPage'
import IncidentsPage   from './pages/IncidentsPage'
import AnalyticsPage   from './pages/AnalyticsPage'
import ModelConfigPage from './pages/ModelConfigPage'
import NotificationsPage from './pages/NotificationsPage'
import UsersPage       from './pages/UsersPage'   // new admin-only page
import { useWebSocket } from './hooks/useWebSocket'
import { useBootstrap } from './hooks/useAlerts'
import { useStore }    from './store'

function Dashboard() {
  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--bg)' }}>
      <StatCards />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CameraGrid />
          <BarChart />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AlertFeed />
          <ZoneMap />
        </div>
      </div>
      <FooterMetrics />
    </main>
  )
}

// Inner app — only rendered when logged in
function AppInner() {
  useBootstrap()
  useWebSocket()

  const activePage    = useStore(s => s.activePage)
  const selectedAlert = useStore(s => s.selectedAlert)
  const { isAdmin, user, logout } = useAuth()

  function renderPage() {
    // Admin-only pages — redirect users to dashboard
    const adminOnly = ['cams-cfg', 'model', 'notifs', 'users']
    if (adminOnly.includes(activePage) && !isAdmin) return <Dashboard />

    switch (activePage) {
      case 'dashboard':  return <Dashboard />
      case 'cameras':    return <CameraGrid fullPage />
      case 'alerts':     return <AlertsPage />
      case 'incidents':  return <IncidentsPage />
      case 'analytics':  return <AnalyticsPage />
      case 'cams-cfg':   return <CamerasPage />
      case 'model':      return <ModelConfigPage />
      case 'notifs':     return <NotificationsPage />
      case 'users':      return <UsersPage />
      default:           return <Dashboard />
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '232px 1fr',
      gridTemplateRows: '60px 1fr',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <TopBar onLogout={logout} user={user} />
      <Sidebar isAdmin={isAdmin} />
      {renderPage()}
      {selectedAlert && <DetectionModal />}
    </div>
  )
}

// Root — shows login or app
function AppRoot() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f5f6fa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace", color: '#6b7592', fontSize: 13,
      }}>
        <div>Loading…</div>
      </div>
    )
  }

  return user ? <AppInner /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  )
}
