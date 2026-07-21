import React, { useState } from 'react'
import Modal from './Modal'
import { api } from '../api/client'
import { useToast } from './Toast'

export default function MenuItemFormModal({ initial, categories, token, onClose, onSubmit, submitting }) {
  const { push } = useToast()
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
  const [uploading, setUploading] = useState(false)
  const [showManualUrl, setShowManualUrl] = useState(false)

  const isEdit = Boolean(initial)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      push('Only JPG or PNG images are supported.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      push('Image is too large — please use a file under 5MB.', 'error')
      return
    }

    setUploading(true)
    try {
      const secureUrl = await api.uploadImageToCloudinary(file)
      setForm((f) => ({ ...f, image_s3_url: secureUrl }))
      push('Photo uploaded.', 'success')
    } catch (err) {
      push(err.message || 'Could not upload this image.', 'error')
    } finally {
      setUploading(false)
    }
  }

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

        <div>
          <label className="field-label">Photo</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-paper border border-espresso/10 flex items-center justify-center overflow-hidden shrink-0">
              {uploading ? (
                <span className="text-xs text-ink/40">Uploading…</span>
              ) : form.image_s3_url ? (
                <img src={form.image_s3_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-ink/30">No photo</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="btn-secondary text-center cursor-pointer">
                {uploading ? 'Uploading…' : form.image_s3_url ? 'Replace photo' : 'Upload photo from device'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </label>
              {form.image_s3_url && !uploading && (
                <button
                  type="button"
                  className="text-xs text-berbere-600 hover:underline self-start"
                  onClick={() => setForm((f) => ({ ...f, image_s3_url: '' }))}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-ink/40 hover:text-ink/60 hover:underline mt-2"
            onClick={() => setShowManualUrl((v) => !v)}
          >
            {showManualUrl ? 'Hide manual URL field' : 'Have an image URL already? Paste it instead'}
          </button>
          {showManualUrl && (
            <input
              className="field-input mt-1.5"
              value={form.image_s3_url}
              onChange={(e) => setForm({ ...form, image_s3_url: e.target.value })}
              placeholder="https://…/kitfo.jpg"
            />
          )}
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
          <button type="submit" className="btn-primary flex-1" disabled={submitting || uploading || categories.length === 0}>
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
