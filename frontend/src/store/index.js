import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Alerts ─────────────────────────────────────────────────────────────────
  alerts: [],
  alertsLoading: false,
  newAlertIds: new Set(),

  setAlerts: (alerts) => set({ alerts }),
  setAlertsLoading: (v) => set({ alertsLoading: v }),

  prependAlert: (alert) => {
    const existing = get().alerts
    const alreadyExists = existing.some(a => a.id === alert.id)
    if (alreadyExists) return
    const newIds = new Set(get().newAlertIds)
    newIds.add(alert.id)
    set({ alerts: [alert, ...existing], newAlertIds: newIds })
    // Clear "new" badge after animation
    setTimeout(() => {
      const ids = new Set(get().newAlertIds)
      ids.delete(alert.id)
      set({ newAlertIds: ids })
    }, 2000)
  },

  updateAlert: (id, patch) =>
    set({
      alerts: get().alerts.map(a =>
        a.id === id ? { ...a, ...patch } : a
      ),
    }),

  // ── Cameras ────────────────────────────────────────────────────────────────
  cameras: [],
  camerasLoading: false,
  setCameras: (cameras) => set({ cameras }),
  setCamerasLoading: (v) => set({ camerasLoading: v }),

  updateCameraStatus: (cameraId, status) =>
    set({
      cameras: get().cameras.map(c =>
        c.id === cameraId ? { ...c, status } : c
      ),
    }),

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats: null,
  hourlyStats: null,
  setStats: (stats) => set({ stats }),
  setHourlyStats: (hourlyStats) => set({ hourlyStats }),

  // ── UI State ───────────────────────────────────────────────────────────────
  selectedAlert: null,
  setSelectedAlert: (alert) => set({ selectedAlert: alert }),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  cameraView: 'all',   // 'all' | 'alert'
  setCameraView: (v) => set({ cameraView: v }),

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
}))
