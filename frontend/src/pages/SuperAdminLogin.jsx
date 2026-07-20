import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext'

export default function SuperAdminLogin() {
  const { login } = useSuperAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/super-admin')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-espresso flex items-center justify-center px-5 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grain pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-berbere/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-berbere-500 mb-2">Platform Owner Access</p>
          <h1 className="font-display italic text-3xl text-paper">Super Admin</h1>
          <p className="text-paper/50 text-sm mt-1.5">Onboard tenants, manage billing & platform status</p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-paper-50 px-6 py-7 space-y-4">
          <div>
            <label className="field-label">Admin email</label>
            <input
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@yourplatform.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-berbere/10 border border-berbere/25 px-3.5 py-2.5 text-sm text-berbere-600">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-paper/35 text-xs mt-6">
          Restaurant manager? <a href="/login" className="underline hover:text-paper/60">Sign in here instead</a>.
        </p>
      </div>
    </div>
  )
}
