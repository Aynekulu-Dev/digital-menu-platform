import React, { useState } from 'react'
import Modal from './Modal'

export default function MenuItemFormModal({ initial, categories, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    category_id: initial?.category_id ?? categories[0]?.id ?? '',
    title_en: initial?.title_en || '',
    title_am: initial?.title_am || '',
    description_en: initial?.description_en || '',
    description_am: initial?.description_am || '',
    price: initial?.price ?? '',
    image_s3_url: initial?.image_s3_url || '',
    is_available: initial?.is_available ?? true,
  })
  const [errors, setErrors] = useState({})

  const isEdit = Boolean(initial)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    try {
      await onSubmit({ ...form, category_id: Number(form.category_id), price: String(form.price) })
    } catch (err) {
      setErrors(err.details || { _general: err.message })
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit menu item' : 'New menu item'}
      subtitle="This is exactly what diners will see when they scan your table's QR code."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Category</label>
          <select
            className="field-input"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            required
          >
            {categories.length === 0 && <option value="">Create a category first</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
          {errors.category_id && <p className="text-xs text-berbere mt-1">{errors.category_id[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Title (English)</label>
            <input
              className="field-input"
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              placeholder="Special Kitfo"
              required
            />
          </div>
          <div>
            <label className="field-label">Title (Amharic)</label>
            <input
              className="field-input"
              value={form.title_am}
              onChange={(e) => setForm({ ...form, title_am: e.target.value })}
              placeholder="ልዩ ክትፎ"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Description (English)</label>
            <textarea
              className="field-input min-h-[70px]"
              value={form.description_en}
              onChange={(e) => setForm({ ...form, description_en: e.target.value })}
              placeholder="Freshly minced lean beef dressed in clarified butter."
            />
          </div>
          <div>
            <label className="field-label">Description (Amharic)</label>
            <textarea
              className="field-input min-h-[70px]"
              value={form.description_am}
              onChange={(e) => setForm({ ...form, description_am: e.target.value })}
              placeholder="በቅቤና በሚጥሚጣ የተዘጋጀ ንፁህ ስጋ።"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Price (ETB)</label>
            <input
              type="number"
              step="0.01"
              className="field-input font-mono"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="450.00"
              required
            />
            {errors.price && <p className="text-xs text-berbere mt-1">{errors.price[0]}</p>}
          </div>
          <div>
            <label className="field-label">Image URL</label>
            <input
              className="field-input"
              value={form.image_s3_url}
              onChange={(e) => setForm({ ...form, image_s3_url: e.target.value })}
              placeholder="https://…/kitfo.jpg"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-turmeric"
            checked={form.is_available}
            onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
          />
          <span className="text-sm text-ink">In stock — visible to diners as available</span>
        </label>

        {errors._general && <p className="text-sm text-berbere">{errors._general}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={submitting || categories.length === 0}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add to menu'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
