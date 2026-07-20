import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext'

export default function SuperAdminProtectedRoute({ children }) {
  const { isAuthenticated } = useSuperAdminAuth()
  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />
  return children
}
