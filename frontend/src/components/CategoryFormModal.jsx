import React, { useState } from 'react'
import Modal from './Modal'

export default function CategoryFormModal({ initial, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    name_en: initial?.name_en || '',
    name_am: initial?.name_am || '',
    sort_order: initial?.sort_order ?? 0,
  })
  const [errors, setErrors] = useState({})

  const isEdit = Boolean(initial)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    try {
      await onSubmit(form)
    } catch (err) {
      setErrors(err.details || { _general: err.message })
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit category' : 'New category'}
      subtitle="Categories group items on the diner's menu, e.g. “Beverages” or “Traditional Dishes.”"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Name (English)</label>
          <input
            className="field-input"
            value={form.name_en}
            onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            placeholder="Traditional Dishes"
            required
          />
        </div>
        <div>
          <label className="field-label">Name (Amharic)</label>
          <input
            className="field-input"
            value={form.name_am}
            onChange={(e) => setForm({ ...form, name_am: e.target.value })}
            placeholder="የባህል ምግቦች"
            required
          />
        </div>
        <div>
          <label className="field-label">Display order</label>
          <input
            type="number"
            className="field-input"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
          />
          <p className="text-xs text-ink/40 mt-1">Lower numbers appear first on the menu.</p>
        </div>

        {errors._general && <p className="text-sm text-berbere">{errors._general}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
