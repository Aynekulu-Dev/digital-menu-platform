import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AcceptInvite from './pages/AcceptInvite'
import PublicMenu from './pages/PublicMenu'
import DashboardLayout from './pages/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Categories from './pages/Categories'
import MenuItems from './pages/MenuItems'
import ChangePassword from './pages/ChangePassword'
import SuperAdminLogin from './pages/SuperAdminLogin'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute'
import { SUPER_ADMIN_PATH } from './superAdminPath'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/menu/:slug" element={<PublicMenu />} />

        <Route path={`${SUPER_ADMIN_PATH}/login`} element={<SuperAdminLogin />} />
        <Route
          path={SUPER_ADMIN_PATH}
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminDashboard />
            </SuperAdminProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="categories" element={<Categories />} />
          <Route path="menu-items" element={<MenuItems />} />
          <Route path="account" element={<ChangePassword />} />
        </Route>

        <Route path="*" element={<Login />} />
      </Routes>
    </ToastProvider>
  )
}