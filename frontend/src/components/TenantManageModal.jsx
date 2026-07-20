import React, { useState } from 'react'
import Modal from './Modal'
import { api } from '../api/client'
import { useToast } from './Toast'

const STATUSES = ['PENDING', 'APPROVED', 'DELINQUENT']

export default function TenantManageModal({ token, tenant, onClose, onUpdated }) {
  const { push } = useToast()
  const [status, setStatus] = useState(tenant.restaurant.monthly_receipt_status)
  const [isActive, setIsActive] = useState(tenant.restaurant.is_active)
  const [savingCompliance, setSavingCompliance] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const saveCompliance = async () => {
    setSavingCompliance(true)
    try {
      await api.updateTenantCompliance(token, tenant.restaurant.id, status)
      push('Billing status updated.', 'success')
      onUpdated()
    } catch (err) {
      push(err.message || 'Could not update billing status.', 'error')
    } finally {
      setSavingCompliance(false)
    }
  }

  const saveActiveState = async (nextActive) => {
    setSavingStatus(true)
    try {
      await api.updateTenantStatus(token, tenant.restaurant.id, nextActive)
      setIsActive(nextActive)
      push(nextActive ? 'Workspace activated.' : 'Workspace deactivated.', 'success')
      onUpdated()
    } catch (err) {
      push(err.message || 'Could not update platform status.', 'error')
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <Modal title={tenant.restaurant.restaurant_name} subtitle={`/${tenant.restaurant.unique_slug}`} onClose={onClose}>
      <div className="space-y-6">
        <div>
          <p className="text-xs text-ink/50 mb-3">
            Items: <span className="font-mono">{tenant.active_quota?.curr_item_count ?? 0} / {tenant.active_quota?.max_menu_items ?? '—'}</span>
            {'  ·  '}
            Scans: <span className="font-mono">{tenant.active_quota?.scan_count ?? 0}</span>
          </p>
        </div>

        <div>
          <label className="field-label">Billing / compliance status</label>
          <div className="flex gap-2 mb-2">
            <select className="field-input flex-1" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={saveCompliance}
              disabled={savingCompliance || status === tenant.restaurant.monthly_receipt_status}
              className="btn-secondary shrink-0"
            >
              {savingCompliance ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-ink/40">
            Setting this to <span className="font-mono">DELINQUENT</span> immediately freezes all of the manager's write access.
          </p>
        </div>

        <div className="pt-4 border-t border-espresso/10">
          <label className="field-label">Platform-level status</label>
          <p className="text-xs text-ink/40 mb-3">
            Independent of billing — a hard suspension (e.g. policy violation). Blocks both the admin dashboard and the public menu.
          </p>
          {isActive ? (
            <button onClick={() => saveActiveState(false)} disabled={savingStatus} className="btn-danger w-full">
              {savingStatus ? 'Working…' : 'Deactivate workspace'}
            </button>
          ) : (
            <button onClick={() => saveActiveState(true)} disabled={savingStatus} className="btn-primary w-full">
              {savingStatus ? 'Working…' : 'Reactivate workspace'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
