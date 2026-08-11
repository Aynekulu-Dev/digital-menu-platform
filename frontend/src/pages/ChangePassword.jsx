import React, { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function ChangePassword() {
  const { token } = useAuth()
  const { push } = useToast()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (next !== confirm) {
      setError("New passwords don't match.")
      return
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await api.changePassword(token, current, next)
      push('Password changed.', 'success')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(err.message || 'Could not change your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-espresso">Change password</h2>
        <p className="text-sm text-ink/50 mt-1">Update the password you use to sign in to this dashboard.</p>
      </div>

      <form onSubmit={handleSubmit} className="card px-6 py-6 space-y-4 max-w-sm">
        <div>
          <label className="field-label">Current password</label>
          <input
            type="password"
            className="field-input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">New password</label>
          <input
            type="password"
            className="field-input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="field-label">Confirm new password</label>
          <input
            type="password"
            className="field-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-berbere/10 border border-berbere/25 px-3.5 py-2.5 text-sm text-berbere-600">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}