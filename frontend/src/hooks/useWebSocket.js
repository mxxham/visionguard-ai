import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { getStatsSummary } from '../api/client'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/detections`
const RECONNECT_DELAY = 3000

export function useWebSocket() {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const mounted = useRef(true)

  const { prependAlert, updateCameraStatus, setStats, setWsConnected } = useStore()

  const connect = useCallback(() => {
    if (!mounted.current) return

    const socket = new WebSocket(WS_URL)
    ws.current = socket

    socket.onopen = () => {
      setWsConnected(true)
      // Heartbeat
      socket._pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }))
        }
      }, 10000)
    }

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.event === 'detection') {
          // Build a partial alert object to prepend immediately
          prependAlert({
            id: data.alert_id,
            detection_id: data.detection_id,
            acknowledged: false,
            dispatched: false,
            created_at: data.timestamp,
            detection: {
              id: data.detection_id,
              camera_id: data.camera_id,
              camera_name: data.camera_name,
              camera_zone: data.camera_zone,
              species: data.species,
              label: data.label,
              confidence: data.confidence,
              severity: data.severity,
              bbox: data.bbox,
              frame_path: data.frame_path,
              timestamp: data.timestamp,
              is_duplicate: false,
            },
          })
          // Refresh stats after new detection
          getStatsSummary().then(r => setStats(r.data)).catch(() => {})
        }

        if (data.event === 'camera_status') {
          updateCameraStatus(data.camera_id, data.status)
        }

        if (data.event === 'stats_update') {
          setStats(data.stats)
        }
      } catch (_) {}
    }

    socket.onclose = () => {
      setWsConnected(false)
      clearInterval(socket._pingInterval)
      if (mounted.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }
    }

    socket.onerror = () => socket.close()
  }, [prependAlert, updateCameraStatus, setStats, setWsConnected])

  useEffect(() => {
    mounted.current = true
    connect()
    return () => {
      mounted.current = false
      clearTimeout(reconnectTimer.current)
      if (ws.current) ws.current.close()
    }
  }, [connect])
}
