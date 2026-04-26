// pages/UsersPage.jsx - Admin-only user management page
import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { listUsers, createUser, toggleUser, deleteUser } from '../api/auth'

const ROLE_STYLE = {
  admin: { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)' },
  user:  { color: '#059669', bg: 'rgba(5,150,105,0.08)',  border: 'rgba(5,150,105,0.2)' },
}

function fmt(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }
  catch { return '—' }
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ username: '', email: '', full_name: '', password: '', role: 'user' })
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving]   = useState(false)

  async function refresh() {
    try {
      const data = await listUsers(me.token)
      setUsers(data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  async function handleCreate() {
    if (!form.username || !form.email || !form.password || !form.full_name) {
      setFormErr('All fields are required'); return
    }
    setSaving(true); setFormErr('')
    try {
      await createUser(me.token, form)
      await refresh()
      setShowAdd(false)
      setForm({ username: '', email: '', full_name: '', password: '', role: 'user' })
    } catch(e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(userId) {
    await toggleUser(me.token, userId)
    await refresh()
  }

  async function handleDelete(userId) {
    if (!confirm('Delete this user permanently?')) return
    await deleteUser(me.token, userId)
    await refresh()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#f5f6fa', border: '1.5px solid #e2e6f0',
    borderRadius: 8, fontSize: 13, color: '#0f1623',
    fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7592',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
  }

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f1623', marginBottom: 3 }}>User Management</h2>
          <p style={{ fontSize: 13, color: '#6b7592' }}>{users.length} accounts · Admin only</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} style={{
          padding: '10px 20px', background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
        }}>
          + Add User
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: '#fff', border: '1.5px solid #2563eb', borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', marginBottom: 18 }}>New User</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {[
              { key: 'full_name', label: 'Full Name', placeholder: 'e.g. John Smith', type: 'text' },
              { key: 'username',  label: 'Username',  placeholder: 'e.g. jsmith',     type: 'text' },
              { key: 'email',     label: 'Email',     placeholder: 'user@company.com', type: 'email' },
              { key: 'password',  label: 'Password',  placeholder: 'Min 8 characters', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type={type} placeholder={placeholder} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Role</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['user', 'admin'].map(r => {
                const s = ROLE_STYLE[r]
                const active = form.role === r
                return (
                  <div key={r} onClick={() => setForm(f => ({ ...f, role: r }))} style={{
                    padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                    fontSize: 13, border: `1.5px solid ${active ? s.border : '#e2e6f0'}`,
                    background: active ? s.bg : 'transparent', color: active ? s.color : '#6b7592',
                    textTransform: 'capitalize', transition: 'all 0.12s',
                  }}>
                    {r === 'admin' ? '⚙ Admin' : '👤 User'}
                  </div>
                )
              })}
            </div>
          </div>
          {formErr && (
            <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 7 }}>
              {formErr}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #e2e6f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6b7592' }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving} style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,22,35,0.06)' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 160px 160px 140px', padding: '12px 20px', borderBottom: '1px solid #e2e6f0', fontSize: 11, fontWeight: 700, color: '#6b7592', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          <span>User</span><span>Username</span><span>Role</span><span>Created</span><span>Last Login</span><span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7592', fontSize: 14 }}>Loading users…</div>
        ) : users.map(u => {
          const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user
          const isMe = u.id === me.id
          return (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 140px 120px 160px 160px 140px',
              padding: '14px 20px', borderBottom: '1px solid #e2e6f0',
              alignItems: 'center', opacity: u.is_active ? 1 : 0.5,
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f6fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f1623', marginBottom: 2 }}>
                  {u.full_name} {isMe && <span style={{ fontSize: 11, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7592' }}>{u.email}</div>
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#2d3752' }}>{u.username}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: rs.color, background: rs.bg, border: `1px solid ${rs.border}`, padding: '3px 10px', borderRadius: 6, textTransform: 'capitalize', width: 'fit-content' }}>
                {u.role}
              </span>
              <span style={{ fontSize: 12, color: '#6b7592', fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(u.created_at)}</span>
              <span style={{ fontSize: 12, color: '#6b7592', fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(u.last_login)}</span>
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={() => handleToggle(u.id)} disabled={isMe} style={{
                  fontSize: 12, padding: '5px 11px', borderRadius: 7, cursor: isMe ? 'not-allowed' : 'pointer',
                  border: `1px solid ${u.is_active ? '#e2e6f0' : 'rgba(5,150,105,0.3)'}`,
                  background: u.is_active ? 'transparent' : 'rgba(5,150,105,0.08)',
                  color: u.is_active ? '#6b7592' : '#059669', fontWeight: 600,
                  opacity: isMe ? 0.4 : 1,
                }}>
                  {u.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(u.id)} disabled={isMe} style={{
                  fontSize: 12, padding: '5px 11px', borderRadius: 7,
                  cursor: isMe ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)',
                  color: '#dc2626', fontWeight: 600, opacity: isMe ? 0.4 : 1,
                }}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
