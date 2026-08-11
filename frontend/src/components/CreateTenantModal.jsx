import React, { useState } from 'react'
import Modal from './Modal'
import { api, ApiError } from '../api/client'
import { useToast } from './Toast'

const TIERS = ['FREE', 'BASIC', 'STANDARD']

export default function CreateTenantModal({ token, onClose, onCreated }) {
  const { push } = useToast()
  const [form, setForm] = useState({
    restaurant_name: '',
    unique_slug: '',
    subscription_tier: 'FREE',
    manager_email: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const slugify = (name) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleNameChange = (e) => {
    const restaurant_name = e.target.value
    setForm((f) => ({
      ...f,
      restaurant_name,
      unique_slug: f._slugTouched ? f.unique_slug : slugify(restaurant_name),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await api.createTenant(token, {
        restaurant_name: form.restaurant_name,
        unique_slug: form.unique_slug,
        subscription_tier: form.subscription_tier,
        manager_email: form.manager_email,
      })
      push('Restaurant workspace created. An invite email was sent to the manager.', 'success')
      onCreated()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details)
      } else {
        push(err.message || 'Could not create the tenant.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Onboard a new restaurant" subtitle="Provisions a workspace and starting quota, then emails the manager a link to set their password." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Restaurant name</label>
          <input className="field-input" value={form.restaurant_name} onChange={handleNameChange} required autoFocus />
        </div>

        <div>
          <label className="field-label">Public menu slug</label>
          <input
            className="field-input font-mono text-sm"
            value={form.unique_slug}
            onChange={(e) => setForm((f) => ({ ...f, unique_slug: e.target.value, _slugTouched: true }))}
            placeholder="skyline-lounge"
            required
          />
          {errors.unique_slug && <p className="text-xs text-berbere-600 mt-1">{errors.unique_slug[0]}</p>}
        </div>

        <div>
          <label className="field-label">Subscription tier</label>
          <select className="field-input" value={form.subscription_tier} onChange={set('subscription_tier')}>
            {TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Manager email</label>
          <input type="email" className="field-input" value={form.manager_email} onChange={set('manager_email')} required />
          {errors.manager_email && <p className="text-xs text-berbere-600 mt-1">{errors.manager_email[0]}</p>}
          <p className="text-xs text-ink/40 mt-1">
            An invite link will be emailed here so the manager can set their own password.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>
    </Modal>
  )
}