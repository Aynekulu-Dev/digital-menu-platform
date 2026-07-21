import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { useToast } from '../components/Toast'
import MenuItemFormModal from '../components/MenuItemFormModal'
import EmptyState from '../components/EmptyState'

function formatPrice(price) {
  return Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MenuItems() {
  const { token, restaurant } = useAuth()
  const { push } = useToast()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const isLocked = restaurant?.monthly_receipt_status === 'DELINQUENT'

  const load = async () => {
    setLoading(true)
    try {
      const [itemData, catData] = await Promise.all([api.listMenuItems(token), api.listCategories(token)])
      setItems(itemData)
      setCategories(catData.sort((a, b) => a.sort_order - b.sort_order))
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
      await api.createMenuItem(token, form)
      push('Item added to your menu.', 'success')
      setModal(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (form) => {
    setSubmitting(true)
    try {
      await api.updateMenuItem(token, modal.id, form)
      push('Item updated.', 'success')
      setModal(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Remove “${item.title_en}” from your menu?`)) return
    setBusyId(item.id)
    try {
      await api.deleteMenuItem(token, item.id)
      push('Item removed.', 'success')
      load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleToggle = async (item) => {
    setBusyId(item.id)
    try {
      await api.toggleAvailability(token, item.id)
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)))
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const grouped = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category_id === cat.id),
  }))
  const uncategorized = items.filter((i) => !categories.some((c) => c.id === i.category_id))

  return (
    <div>
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-turmeric-600 mb-1">Menu structure</p>
          <h1 className="font-display text-3xl text-espresso">Menu items</h1>
          <p className="text-ink/55 mt-1">What diners actually see, price and all.</p>
        </div>
        <button
          className="btn-primary shrink-0"
          onClick={() => setModal('create')}
          disabled={isLocked || categories.length === 0}
        >
          + New item
        </button>
      </header>

      {loading ? (
        <p className="text-ink/40 text-sm">Loading…</p>
      ) : categories.length === 0 ? (
        <EmptyState
          title="Add a category first"
          description="Menu items live inside categories. Head to the Categories tab to create one, then come back here."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No menu items yet"
          description="Add your first dish or drink — name, price, and a photo if you've got one."
          action={<button className="btn-primary" onClick={() => setModal('create')}>Add your first item</button>}
        />
      ) : (
        <div className="space-y-8">
          {grouped.filter((g) => g.items.length > 0).map((cat) => (
            <section key={cat.id}>
              <h2 className="font-display text-lg text-espresso/80 mb-3">{cat.name_en}</h2>
              <ul className="space-y-2.5">
                {cat.items.map((item) => (
                  <li key={item.id} className="card px-5 py-4">
                    <div className="flex items-start gap-4">
                      {item.image_s3_url ? (
                        <img
                          src={item.image_s3_url}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-espresso/5"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl shrink-0 bg-espresso/5 flex items-center justify-center text-espresso/20 font-display text-xl">
                          {item.title_en[0]}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="font-display text-lg text-espresso truncate">{item.title_en}</p>
                          <span className="menu-leader" />
                          <span className="font-mono text-sm text-espresso shrink-0">{formatPrice(item.price)} ETB</span>
                        </div>
                        <p className="text-sm text-ink/50 truncate">{item.title_am}</p>
                        {item.description_en && (
                          <p className="text-sm text-ink/45 mt-1 line-clamp-1">{item.description_en}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-espresso/8">
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={isLocked || busyId === item.id}
                        className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition
                          ${item.is_available
                            ? 'bg-herb/10 text-herb-600 hover:bg-herb/15'
                            : 'bg-berbere/10 text-berbere-600 hover:bg-berbere/15'}`}
                      >
                        {item.is_available ? '● Available' : '● Sold out'}
                      </button>
                      <div className="flex gap-2">
                        <button className="btn-secondary !px-4 !py-1.5 !text-xs" onClick={() => setModal(item)} disabled={isLocked}>
                          Edit
                        </button>
                        <button
                          className="btn-danger !px-4 !py-1.5 !text-xs"
                          onClick={() => handleDelete(item)}
                          disabled={isLocked || busyId === item.id}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <MenuItemFormModal
          initial={modal === 'create' ? null : modal}
          categories={categories}
          token={token}
          onClose={() => setModal(null)}
          onSubmit={modal === 'create' ? handleCreate : handleUpdate}
          submitting={submitting}
        />
      )}
    </div>
  )
}
