import { useState } from 'react'
import { useStore } from '../store'
import { createCamera, updateCamera, deleteCamera, getCameras } from '../api/client'

const STATUS_COLOR = {
  online:  'var(--accent)',
  offline: 'var(--muted)',
  error:   'var(--critical)',
}

function CameraForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', zone: '', rtsp_url: '', device_index: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        zone: form.zone,
        rtsp_url: form.rtsp_url || null,
        device_index: form.device_index !== '' ? parseInt(form.device_index) : null,
      }
      await onSave(payload)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save camera')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    background: 'var(--surface2)', border: '1px solid var(--border2)',
    borderRadius: 6, color: 'var(--text)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  }

  const labelStyle = {
    fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Camera Name *</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. CAM-10"
          />
        </div>
        <div>
          <label style={labelStyle}>Zone *</label>
          <input
            style={inputStyle}
            value={form.zone}
            onChange={e => set('zone', e.target.value)}
            placeholder="e.g. Zone A – Aisle 1"
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Video Source (RTSP URL or file path)</label>
        <input
          style={inputStyle}
          value={form.rtsp_url}
          onChange={e => set('rtsp_url', e.target.value)}
          placeholder="rtsp://... or /app/videos/loop.mp4"
        />
      </div>
      <div>
        <label style={labelStyle}>Device Index (webcam, e.g. 0)</label>
        <input
          style={inputStyle}
          value={form.device_index}
          onChange={e => set('device_index', e.target.value)}
          placeholder="Leave blank if using RTSP/file"
          type="number"
        />
      </div>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--critical)', padding: '8px 10px', background: 'var(--critical-dim)', borderRadius: 6 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '8px 16px', background: 'transparent', border: '1px solid var(--border2)',
          color: 'var(--muted)', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !form.name || !form.zone} style={{
          padding: '8px 16px', background: 'var(--accent)', border: 'none',
          color: '#000', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          opacity: saving || !form.name || !form.zone ? 0.5 : 1,
        }}>{saving ? 'Saving…' : 'Save Camera'}</button>
      </div>
    </div>
  )
}

export default function CamerasPage() {
  const cameras    = useStore(s => s.cameras)
  const setCameras = useStore(s => s.setCameras)
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function refreshCameras() {
    const res = await getCameras()
    setCameras(res.data)
  }

  async function handleAdd(payload) {
    await createCamera(payload)
    await refreshCameras()
    setShowAdd(false)
  }

  async function handleEdit(payload) {
    await updateCamera(editing.id, payload)
    await refreshCameras()
    setEditing(null)
  }

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await deleteCamera(id)
      await refreshCameras()
    } catch (e) { console.error(e) }
    finally { setDeleting(null) }
  }

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Camera Configuration
        </h2>
        <button
          onClick={() => { setShowAdd(true); setEditing(null) }}
          style={{
            padding: '8px 16px', background: 'var(--accent)', border: 'none',
            color: '#000', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          + Add Camera
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
            New Camera
          </div>
          <CameraForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {/* Camera list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '50px 1fr 160px 100px 80px 120px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          <span>ID</span><span>Name / Zone</span><span>Source</span>
          <span>Status</span><span>Active</span><span>Actions</span>
        </div>

        {cameras.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No cameras configured yet. Add your first camera above.
          </div>
        ) : cameras.map(cam => (
          <div key={cam.id}>
            {editing?.id === cam.id ? (
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <CameraForm
                  initial={{ name: cam.name, zone: cam.zone, rtsp_url: cam.rtsp_url || '', device_index: cam.device_index ?? '' }}
                  onSave={handleEdit}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: '50px 1fr 160px 100px 80px 120px',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                alignItems: 'center', fontSize: 13,
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11 }}>#{cam.id}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{cam.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{cam.zone}</div>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', wordBreak: 'break-all' }}>
                  {cam.rtsp_url || (cam.device_index !== null ? `device:${cam.device_index}` : '—')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: STATUS_COLOR[cam.status] || 'var(--muted)',
                    display: 'inline-block',
                    animation: cam.status === 'online' ? 'pulse 2s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: STATUS_COLOR[cam.status] || 'var(--muted)', textTransform: 'uppercase' }}>
                    {cam.status || 'unknown'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: cam.is_active ? 'var(--accent)' : 'var(--muted)' }}>
                  {cam.is_active ? '● Active' : '○ Inactive'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditing(cam)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 4,
                    border: '1px solid var(--border2)', background: 'transparent',
                    color: 'var(--muted)', cursor: 'pointer',
                  }}>Edit</button>
                  <button
                    onClick={() => handleDelete(cam.id)}
                    disabled={deleting === cam.id}
                    style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 4,
                      border: '1px solid var(--critical)', background: 'transparent',
                      color: 'var(--critical)', cursor: 'pointer',
                      opacity: deleting === cam.id ? 0.5 : 1,
                    }}
                  >{deleting === cam.id ? '…' : 'Delete'}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}