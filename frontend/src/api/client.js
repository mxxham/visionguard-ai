import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Cameras
export const getCameras = () => api.get('/cameras/')
export const createCamera = (data) => api.post('/cameras/', data)
export const updateCamera = (id, data) => api.patch(`/cameras/${id}`, data)
export const deleteCamera = (id) => api.delete(`/cameras/${id}`)

// Alerts
export const getAlerts = (params = {}) => api.get('/alerts/', { params })
export const getAlert = (id) => api.get(`/alerts/${id}`)
export const acknowledgeAlert = (id, data) => api.post(`/alerts/${id}/acknowledge`, data)
export const dispatchAlert = (id, data) => api.post(`/alerts/${id}/dispatch`, data)

// Stats
export const getStatsSummary = () => api.get('/stats/summary')
export const getHourlyStats = () => api.get('/stats/hourly')

export default api
