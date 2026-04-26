// AuthContext.jsx - Wrap your App with this
import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, getMe } from './api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)  // checking saved token

  // On mount, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('vg_token')
    if (!token) { setLoading(false); return }
    getMe(token)
      .then(u => setUser({ ...u, token }))
      .catch(() => localStorage.removeItem('vg_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const data = await loginUser(username, password)
    localStorage.setItem('vg_token', data.access_token)
    setUser({ ...data.user, token: data.access_token })
    return data.user
  }

  function logout() {
    localStorage.removeItem('vg_token')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
