import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { useToast } from '../components/Toast'
import CategoryFormModal from '../components/CategoryFormModal'
import EmptyState from '../components/EmptyState'

export default function Categories() {
  const { token, restaurant } = useAuth()
  const { push } = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | category object
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const isLocked = restaurant?.monthly_receipt_status === 'DELINQUENT'

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.listCategories(token)
      setCategories(data.sort((a, b) => a.sort_order - b.sort_order))
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    setSubmitting(true)
    try {
      await api.createCategory(token, form)
      push('Category created.', 'success')
      setModal(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (form) => {
    setSubmitting(true)
    try {
      await api.updateCategory(token, modal.id, form)
      push('Category updated.', 'success')
      setModal(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (category) => {
    if (!confirm(`Delete “${category.name_en}”? All menu items inside it will be removed too.`)) return
    setDeletingId(category.id)
    try {
      await api.deleteCategory(token, category.id)
      push('Category deleted.', 'success')
      load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-turmeric-600 mb-1">Menu structure</p>
          <h1 className="font-display text-3xl text-espresso">Categories</h1>
          <p className="text-ink/55 mt-1">Group your menu the way diners scan it, top to bottom.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setModal('create')} disabled={isLocked}>
          + New category
        </button>
      </header>

      {loading ? (
        <p className="text-ink/40 text-sm">Loading…</p>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Start with something like “Beverages” or “Traditional Dishes” — your menu items will live inside these."
          action={<button className="btn-primary" onClick={() => setModal('create')}>Create your first category</button>}
        />
      ) : (
        <ul className="space-y-2.5">
          {categories.map((cat) => (
            <li key={cat.id} className="card px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-lg text-espresso truncate">{cat.name_en}</p>
                <p className="text-sm text-ink/50 truncate">{cat.name_am} · position {cat.sort_order}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn-secondary !px-4 !py-2" onClick={() => setModal(cat)} disabled={isLocked}>
                  Edit
                </button>
                <button
                  className="btn-danger !px-4 !py-2"
                  onClick={() => handleDelete(cat)}
                  disabled={isLocked || deletingId === cat.id}
                >
                  {deletingId === cat.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <CategoryFormModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSubmit={modal === 'create' ? handleCreate : handleUpdate}
          submitting={submitting}
        />
      )}
    </div>
  )
}
