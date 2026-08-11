import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-espresso flex items-center justify-center px-5 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grain pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-turmeric/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-turmeric mb-2">Digital Menu Platform</p>
          <h1 className="font-display italic text-3xl text-paper">Reset your password</h1>
          <p className="text-paper/50 text-sm mt-1.5">We'll email you a link to set a new one</p>
        </div>

        <div className="card bg-paper-50 px-6 py-7 space-y-4">
          {sent ? (
            <>
              <div className="rounded-lg bg-turmeric/10 border border-turmeric/25 px-3.5 py-2.5 text-sm text-espresso">
                If that email is associated with a workspace, a reset link has been sent. Check your inbox.
              </div>
              <Link to="/login" className="btn-secondary w-full block text-center">Back to sign in</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Manager email</label>
                <input
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@yourrestaurant.com"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-lg bg-berbere/10 border border-berbere/25 px-3.5 py-2.5 text-sm text-berbere-600">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <Link to="/login" className="text-center text-sm text-ink/50 block">Back to sign in</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}