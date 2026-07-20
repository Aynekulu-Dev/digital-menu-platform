import React, { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../api/client'

const SuperAdminAuthContext = createContext(null)

const STORAGE_KEY = 'menu_platform_super_admin_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function SuperAdminAuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const login = useCallback(async (email, password) => {
    const res = await api.superAdminLogin(email, password)
    const next = { token: res.token, admin: res.admin_context }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSession(next)
    return next
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  const value = {
    session,
    token: session?.token ?? null,
    admin: session?.admin ?? null,
    isAuthenticated: Boolean(session?.token),
    login,
    logout,
  }

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext)
  if (!ctx) throw new Error('useSuperAdminAuth must be used within SuperAdminAuthProvider')
  return ctx
}
