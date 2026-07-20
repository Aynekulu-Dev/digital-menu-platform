import React, { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext'
import CreateTenantModal from '../components/CreateTenantModal'
import TenantManageModal from '../components/TenantManageModal'
import EmptyState from '../components/EmptyState'

function StatusBadge({ status }) {
  const styles = {
    APPROVED: 'bg-herb/10 text-herb-600 border-herb/25',
    PENDING: 'bg-turmeric/10 text-turmeric-600 border-turmeric/25',
    DELINQUENT: 'bg-berbere/10 text-berbere-600 border-berbere/25',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] || ''}`}>
      {status}
    </span>
  )
}

export default function SuperAdminDashboard() {
  const { token, admin, logout } = useSuperAdminAuth()
  const [tenants, setTenants] = useState(null)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [manageTarget, setManageTarget] = useState(null)

  const load = useCallback(() => {
    api.listTenants(token)
      .then((res) => setTenants(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load tenants.'))
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-espresso text-paper px-5 sm:px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.2em] uppercase text-berbere-500 mb-1">Platform Owner</p>
            <h1 className="font-display text-2xl">{admin?.full_name || 'Super Admin'}</h1>
          </div>
          <button onClick={logout} className="text-sm text-paper/60 hover:text-paper transition">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-espresso">Tenant workspaces</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Onboard restaurant</button>
        </div>

        {error && (
          <div className="rounded-lg bg-berbere/10 border border-berbere/25 px-3.5 py-2.5 text-sm text-berbere-600 mb-5">
            {error}
          </div>
        )}

        {tenants === null && !error && <p className="text-sm text-ink/40">Loading…</p>}

        {tenants?.length === 0 && (
          <EmptyState
            title="No restaurants yet"
            description="Onboard your first tenant to provision their workspace, manager login, and starting quota."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">+ Onboard restaurant</button>}
          />
        )}

        {tenants?.length > 0 && (
          <div className="space-y-3">
            {tenants.map((t) => (
              <div key={t.restaurant.id} className="card px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg text-espresso">{t.restaurant.restaurant_name}</span>
                    <StatusBadge status={t.restaurant.monthly_receipt_status} />
                    {!t.restaurant.is_active && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-ink/5 text-ink/50 border-ink/15">
                        DEACTIVATED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/45 font-mono mt-0.5">/{t.restaurant.unique_slug} · {t.restaurant.manager_email}</p>
                  <p className="text-xs text-ink/40 mt-1">
                    {t.restaurant.subscription_tier} tier · {t.active_quota?.curr_item_count ?? 0}/{t.active_quota?.max_menu_items ?? '—'} items · {t.active_quota?.scan_count ?? 0} scans
                  </p>
                </div>
                <button onClick={() => setManageTarget(t)} className="btn-secondary shrink-0">Manage</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateTenantModal token={token} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {manageTarget && (
        <TenantManageModal
          token={token}
          tenant={manageTarget}
          onClose={() => setManageTarget(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
