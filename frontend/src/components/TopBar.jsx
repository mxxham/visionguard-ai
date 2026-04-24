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
      padding: '0 28px',
      gap: 16,
      height: 60,
      boxShadow: '0 1px 0 var(--border)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34,
          background: 'var(--accent)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 15, color: '#fff',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
        }}>
          ⬡
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text)',
          letterSpacing: '0.06em', fontWeight: 600,
        }}>
          VISIONGUARD <span style={{ color: 'var(--accent)' }}>AI</span>
        </span>
      </div>

      <div style={{
        width: 1, height: 24, background: 'var(--border)', marginLeft: 4,
      }} />

      <span style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
        Warehouse Bio-Hazard Detection System
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* WS status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: wsConnected ? 'var(--green-dim, rgba(5,150,105,0.08))' : 'var(--critical-dim)',
          padding: '5px 12px', borderRadius: 20,
          border: `1px solid ${wsConnected ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: wsConnected ? '#059669' : 'var(--critical)',
            animation: wsConnected ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: wsConnected ? '#059669' : 'var(--critical)',
            fontWeight: 600, letterSpacing: '0.08em',
          }}>
            {wsConnected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--text2)', fontWeight: 500,
        }}>
          {time}
        </span>
      </div>
    </header>
  )
}
