import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { setSessionFromAuthResponse } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await api.acceptInvite(token, password)
      setSessionFromAuthResponse(res)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Could not activate your account.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center px-5 text-center">
        <div className="max-w-sm">
          <p className="text-paper text-lg mb-2">Missing invite link</p>
          <p className="text-paper/50 text-sm">
            This page needs the link from your invite email — check your inbox, or ask the
            platform owner to resend it.
          </p>
          <Link to="/login" className="text-turmeric text-sm mt-4 inline-block">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-espresso flex items-center justify-center px-5 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grain pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-turmeric/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-turmeric mb-2">Digital Menu Platform</p>
          <h1 className="font-display italic text-3xl text-paper">Activate your account</h1>
          <p className="text-paper/50 text-sm mt-1.5">Set a password to finish setting up your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-paper-50 px-6 py-7 space-y-4">
          <div>
            <label className="field-label">New password</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Confirm password</label>
            <input
              type="password"
              className="field-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-berbere/10 border border-berbere/25 px-3.5 py-2.5 text-sm text-berbere-600">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Activating…' : 'Activate & sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}