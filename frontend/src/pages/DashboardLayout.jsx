import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
          <Outlet />
        </div>
        <div className="md:hidden px-8 pb-10">
          <button onClick={logout} className="text-sm text-espresso/50">
            Sign out
          </button>
        </div>
      </main>
    </div>
  )
}
