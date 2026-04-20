import { useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { getAlerts, getStatsSummary, getHourlyStats, getCameras } from '../api/client'

export function useBootstrap() {
  const {
    setAlerts, setAlertsLoading,
    setCameras, setCamerasLoading,
    setStats, setHourlyStats,
  } = useStore()

  const fetchAll = useCallback(async () => {
    setAlertsLoading(true)
    setCamerasLoading(true)
    try {
      const [alertsRes, camerasRes, statsRes, hourlyRes] = await Promise.all([
        getAlerts({ limit: 50 }),
        getCameras(),
        getStatsSummary(),
        getHourlyStats(),
      ])
      setAlerts(alertsRes.data)
      setCameras(camerasRes.data)
      setStats(statsRes.data)
      setHourlyStats(hourlyRes.data)
    } catch (err) {
      console.error('Bootstrap fetch failed:', err)
    } finally {
      setAlertsLoading(false)
      setCamerasLoading(false)
    }
  }, [setAlerts, setAlertsLoading, setCameras, setCamerasLoading, setStats, setHourlyStats])

  useEffect(() => {
    fetchAll()
    // Poll stats every 30s as fallback
    const interval = setInterval(() => {
      getStatsSummary().then(r => setStats(r.data)).catch(() => {})
      getHourlyStats().then(r => setHourlyStats(r.data)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { refetch: fetchAll }
}
