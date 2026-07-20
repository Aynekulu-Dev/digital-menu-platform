import React from 'react'

export default function QuotaBar({ current, max, label = 'Menu items used' }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const isNear = pct >= 85

  return (
    <div className="card px-5 py-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-espresso/60">{label}</span>
        <span className="font-mono text-sm text-ink">
          {current} <span className="text-ink/40">/ {max}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-espresso/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isNear ? 'bg-berbere' : 'bg-turmeric'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isNear && (
        <p className="text-xs text-berbere mt-2">
          You're close to your plan's item limit. Remove unused items or upgrade your tier.
        </p>
      )}
    </div>
  )
}
