// api/auth.js
// Uses relative /api path — proxied to backend:8000 via vite.config.js
const BASE = '/api'

export async function loginUser(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Login failed')
  }
  return res.json()
}

export async function getMe(token) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Session expired')
  return res.json()
}

export async function listUsers(token) {
  const res = await fetch(`${BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createUser(token, payload) {
  const res = await fetch(`${BASE}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail) }
  return res.json()
}

export async function toggleUser(token, userId) {
  const res = await fetch(`${BASE}/auth/users/${userId}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function deleteUser(token, userId) {
  await fetch(`${BASE}/auth/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
