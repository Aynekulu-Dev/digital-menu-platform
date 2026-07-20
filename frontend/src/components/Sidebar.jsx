import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/categories', label: 'Categories' },
  { to: '/dashboard/menu-items', label: 'Menu items' },
]

export default function Sidebar() {
  const { restaurant, logout } = useAuth()

  return (
    <aside className="w-full md:w-64 shrink-0 md:min-h-screen bg-espresso text-paper flex md:flex-col">
      <div className="px-6 py-6 hidden md:block">
        <p className="font-display text-xs tracking-[0.2em] uppercase text-turmeric mb-1">Digital Menu</p>
        <h1 className="font-display text-xl leading-tight">{restaurant?.restaurant_name || 'Your workspace'}</h1>
        <p className="text-xs text-paper/50 mt-1 font-mono">/{restaurant?.unique_slug}</p>
      </div>

      <nav className="flex md:flex-col flex-1 px-2 md:px-4 gap-1 py-2 md:py-0 overflow-x-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition
               ${isActive ? 'bg-turmeric text-espresso' : 'text-paper/70 hover:text-paper hover:bg-paper/10'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="hidden md:block px-4 py-6 mt-auto border-t border-paper/10">
        <button onClick={logout} className="text-sm text-paper/60 hover:text-paper transition px-4">
          Sign out
        </button>
      </div>
    </aside>
  )
}
