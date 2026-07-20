import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import QuotaBar from '../components/QuotaBar'

export default function DashboardHome() {
  const { token, restaurant } = useAuth()
  const [quota, setQuota] = useState(null)
  const [counts, setCounts] = useState({ categories: 0, items: 0, available: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState(null)
  const [qrError, setQrError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [ws, cats, items] = await Promise.all([
          api.getMyWorkspace(token),
          api.listCategories(token),
          api.listMenuItems(token),
        ])
        if (ignore) return
        setQuota(ws.data.active_quota)
        setCounts({
          categories: cats.length,
          items: items.length,
          available: items.filter((i) => i.is_available).length,
        })
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token])

  useEffect(() => {
    let ignore = false
    let objectUrl = null
    async function loadQr() {
      try {
        const blob = await api.getMyRestaurantQrBlob(token)
        if (ignore) return
        objectUrl = URL.createObjectURL(blob)
        setQrUrl(objectUrl)
      } catch (err) {
        if (!ignore) setQrError(err.message || 'Could not generate the QR code.')
      }
    }
    loadQr()
    return () => {
      ignore = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [token])

  const menuUrl = `${window.location.origin}/menu/${restaurant?.unique_slug}`

  const copyLink = () => {
    navigator.clipboard?.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const downloadQr = () => {
    if (!qrUrl) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `${restaurant?.unique_slug || 'menu'}-qr-code.png`
    a.click()
  }

  const printQr = () => {
    if (!qrUrl) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${restaurant?.restaurant_name || 'Menu'} — QR Code</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <img src="${qrUrl}" style="width:320px;height:320px;" />
        <p style="margin-top:16px;font-size:18px;">${restaurant?.restaurant_name || ''}</p>
        <p style="color:#888;">Scan to view our menu</p>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  const isDelinquent = restaurant?.monthly_receipt_status === 'DELINQUENT'

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-turmeric-600 mb-1">Overview</p>
        <h1 className="font-display text-3xl text-espresso">Good to see you.</h1>
        <p className="text-ink/55 mt-1">Here's how {restaurant?.restaurant_name} is set up right now.</p>
      </header>

      {isDelinquent && (
        <div className="mb-6 rounded-xl bg-berbere/10 border border-berbere/25 px-4 py-3.5 text-sm text-berbere-600">
          <strong className="font-semibold">Billing is past due.</strong> Menu edits are paused until your
          subscription is settled. Contact your platform administrator to restore access.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-espresso/60 mb-1">Categories</p>
          <p className="font-display text-3xl text-espresso">{loading ? '—' : counts.categories}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-espresso/60 mb-1">Menu items</p>
          <p className="font-display text-3xl text-espresso">{loading ? '—' : counts.items}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-espresso/60 mb-1">Available now</p>
          <p className="font-display text-3xl text-herb-600">{loading ? '—' : counts.available}</p>
        </div>
      </div>

      {quota && (
        <div className="mb-6">
          <QuotaBar current={quota.curr_item_count} max={quota.max_menu_items} />
        </div>
      )}

      <div className="card px-5 py-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-espresso/60 mb-3">Table QR code</p>
        <div className="flex flex-wrap items-center gap-5">
          <div className="w-40 h-40 rounded-xl bg-paper flex items-center justify-center border border-espresso/10 shrink-0 overflow-hidden">
            {qrUrl ? (
              <img src={qrUrl} alt="Menu QR code" className="w-full h-full object-contain" />
            ) : qrError ? (
              <p className="text-xs text-berbere-600 text-center px-3">{qrError}</p>
            ) : (
              <p className="text-xs text-ink/40">Generating…</p>
            )}
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm text-ink/55 mb-3">
              Print this and place it on your tables — scanning it opens your live menu instantly, no app required.
            </p>
            <div className="flex gap-2">
              <button onClick={downloadQr} disabled={!qrUrl} className="btn-secondary">Download PNG</button>
              <button onClick={printQr} disabled={!qrUrl} className="btn-secondary">Print</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-espresso/60 mb-2">Your public menu link</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/menu/${restaurant?.unique_slug}`}
            target="_blank"
            className="font-mono text-sm text-espresso bg-espresso/5 rounded-lg px-3 py-2 flex-1 min-w-0 truncate hover:bg-espresso/10 transition"
          >
            {menuUrl}
          </Link>
          <button onClick={copyLink} className="btn-secondary shrink-0">
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
        <p className="text-xs text-ink/45 mt-2.5">
          Share this link directly, or use the QR code above for printed table cards.
        </p>
      </div>
    </div>
  )
}
