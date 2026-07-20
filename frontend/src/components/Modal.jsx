import React, { useEffect } from 'react'

export default function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-paper-50 rounded-t-3xl sm:rounded-2xl shadow-card
                      max-h-[92vh] overflow-y-auto border border-espresso/10 animate-[slideup_.25s_ease-out]">
        <div className="sticky top-0 bg-paper-50/95 backdrop-blur px-6 pt-6 pb-4 border-b border-espresso/8 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-espresso">{title}</h2>
            {subtitle && <p className="text-sm text-ink/50 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-espresso/50 hover:bg-espresso/8 hover:text-espresso transition"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
