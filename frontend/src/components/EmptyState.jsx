import React from 'react'

export default function EmptyState({ title, description, action }) {
  return (
    <div className="border border-dashed border-espresso/20 rounded-2xl px-6 py-14 text-center">
      <p className="font-display text-xl text-espresso mb-1.5">{title}</p>
      <p className="text-sm text-ink/55 max-w-sm mx-auto mb-5">{description}</p>
      {action}
    </div>
  )
}
