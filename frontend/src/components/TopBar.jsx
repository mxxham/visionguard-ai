import { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function TopBar() {
  const [time, setTime] = useState('')
  const wsConnected = useStore(s => s.wsConnected)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour12: false }) + ' WIB')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header style={{
      gridColumn: '1 / -1',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      height: 56,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28,
          border: '1.5px solid var(--accent)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          fontFamily: 'var(--font-mono)',
          fontSize: 10, color: 'var(--accent)',
        }}>
          <span style={{ position: 'relative', zIndex: 1 }}>⬡</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', letterSpacing: '0.08em' }}>
          VISIONGUARD AI
        </span>
      </div>

      <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>
        Warehouse Bio-Hazard Detection System
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* WS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: wsConnected ? 'var(--accent)' : 'var(--critical)',
            animation: wsConnected ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: wsConnected ? 'var(--accent)' : 'var(--critical)', letterSpacing: '0.1em' }}>
            {wsConnected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          {time}
        </span>
      </div>
    </header>
  )
}
