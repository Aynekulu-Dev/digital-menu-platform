import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext'
import { SUPER_ADMIN_PATH } from '../superAdminPath'

export default function SuperAdminProtectedRoute({ children }) {
  const { isAuthenticated } = useSuperAdminAuth()
  if (!isAuthenticated) return <Navigate to={`${SUPER_ADMIN_PATH}/login`} replace />
  return children
}