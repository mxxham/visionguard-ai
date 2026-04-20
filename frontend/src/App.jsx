import { useState } from 'react'
import TopBar        from './components/TopBar'
import Sidebar       from './components/Sidebar'
import StatCards     from './components/StatCards'
import CameraGrid    from './components/CameraGrid'
import AlertFeed     from './components/AlertFeed'
import BarChart      from './components/BarChart'
import ZoneMap       from './components/ZoneMap'
import FooterMetrics from './components/FooterMetrics'
import DetectionModal from './components/DetectionModal'
import CamerasPage   from './pages/CamerasPage'
import AlertsPage    from './pages/AlertsPage'
import IncidentsPage from './pages/IncidentsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ModelConfigPage from './pages/ModelConfigPage'
import NotificationsPage from './pages/NotificationsPage'
import { useWebSocket } from './hooks/useWebSocket'
import { useBootstrap } from './hooks/useAlerts'
import { useStore } from './store'

function Dashboard() {
  return (
    <main style={{
      overflowY: 'auto',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <StatCards />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
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

export default function App() {
  useBootstrap()
  useWebSocket()

  const activePage    = useStore(s => s.activePage)
  const selectedAlert = useStore(s => s.selectedAlert)

  function renderPage() {
    switch (activePage) {
      case 'dashboard':  return <Dashboard />
      case 'cameras':    return <CameraGrid fullPage />
      case 'alerts':     return <AlertsPage />
      case 'incidents':  return <IncidentsPage />
      case 'analytics':  return <AnalyticsPage />
      case 'cams-cfg':   return <CamerasPage />
      case 'model':      return <ModelConfigPage />
      case 'notifs':     return <NotificationsPage />
      default:           return <Dashboard />
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gridTemplateRows: '56px 1fr',
      minHeight: '100vh',
    }}>
      <TopBar />
      <Sidebar />
      {renderPage()}
      {selectedAlert && <DetectionModal />}
    </div>
  )
}