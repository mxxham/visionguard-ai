// LoginPage.jsx
import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      // AuthContext sets user → App re-renders to dashboard automatically
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Accent blobs */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-60px',
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#ffffff',
        border: '1px solid #e2e6f0',
        borderRadius: 20,
        padding: '48px 44px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 4px 24px rgba(15,22,35,0.08), 0 1px 4px rgba(15,22,35,0.04)',
      }}>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}>
            ⬡
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13, fontWeight: 600,
            color: '#2563eb', letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            VISIONGUARD AI
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f1623', marginBottom: 6 }}>
            Welcome back
          </div>
          <div style={{ fontSize: 14, color: '#6b7592', fontWeight: 400 }}>
            Sign in to your account to continue
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 10, padding: '11px 14px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 9,
          }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Username */}
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#2d3752', marginBottom: 7,
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
              placeholder="Enter your username"
              autoComplete="username"
              style={{
                width: '100%', padding: '11px 14px',
                background: '#f5f6fa',
                border: '1.5px solid #e2e6f0',
                borderRadius: 10,
                fontSize: 14, color: '#0f1623',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#2563eb'
                e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
                e.target.style.background = '#ffffff'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#e2e6f0'
                e.target.style.boxShadow = 'none'
                e.target.style.background = '#f5f6fa'
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#2d3752', marginBottom: 7,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '11px 44px 11px 14px',
                  background: '#f5f6fa',
                  border: '1.5px solid #e2e6f0',
                  borderRadius: 10,
                  fontSize: 14, color: '#0f1623',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
                  e.target.style.background = '#ffffff'
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e6f0'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = '#f5f6fa'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#6b7592',
                  fontSize: 16, padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (!loading) e.target.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>

        {/* Role hint */}
        <div style={{
          marginTop: 28,
          padding: '14px 16px',
          background: '#f0f2f8',
          borderRadius: 10,
          border: '1px solid #e2e6f0',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7592', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Access Levels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { role: 'Admin', color: '#2563eb', desc: 'Full system control — cameras, model, users' },
              { role: 'User',  color: '#059669', desc: 'Monitor alerts, acknowledge & dispatch' },
            ].map(({ role, color, desc }) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                  padding: '2px 8px', borderRadius: 5,
                  fontFamily: "'IBM Plex Mono', monospace",
                  whiteSpace: 'nowrap',
                }}>
                  {role}
                </span>
                <span style={{ fontSize: 12, color: '#6b7592' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          VisionGuard AI · Warehouse Security System
        </div>
      </div>
    </div>
  )
}
