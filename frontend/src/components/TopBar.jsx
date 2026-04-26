import { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function TopBar({ user, onLogout }) {
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

      <div style={{ width: 1, height: 24, background: 'var(--border)', marginLeft: 4 }} />

      <span style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
        Warehouse Bio-Hazard Detection System
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* WS status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: wsConnected ? 'rgba(5,150,105,0.08)' : 'var(--critical-dim)',
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

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
          {time}
        </span>

        {/* User pill + logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '5px 14px',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: user.role === 'admin' ? 'var(--accent)' : '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff', fontWeight: 700,
              }}>
                {user.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {user.full_name}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: user.role === 'admin' ? 'var(--accent)' : '#059669',
                background: user.role === 'admin' ? 'var(--accent-dim)' : 'rgba(5,150,105,0.1)',
                padding: '2px 7px', borderRadius: 5,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'var(--font-mono)',
              }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 600,
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.target.style.color = 'var(--critical)'; e.target.style.borderColor = 'rgba(220,38,38,0.3)' }}
              onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.borderColor = 'var(--border)' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
