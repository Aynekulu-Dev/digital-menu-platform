import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'

function formatPrice(price) {
  return Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PublicMenu() {
  const { slug } = useParams()
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState(null)
  const [lang, setLang] = useState('en') // 'en' | 'am'
  const [activeCat, setActiveCat] = useState(null)
  const sectionRefs = useRef({})

  useEffect(() => {
    let ignore = false
    api.getPublicMenu(slug)
      .then((data) => {
        if (ignore) return
        setMenu(data)
        setActiveCat(data.menu_categories[0]?.id ?? null)
      })
      .catch((err) => {
        if (ignore) return
        setError(err instanceof ApiError ? err.message : 'Could not load this menu.')
      })
    return () => { ignore = true }
  }, [slug])

  const scrollTo = (id) => {
    setActiveCat(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-display italic text-2xl text-paper mb-2">This menu isn't available</p>
          <p className="text-paper/50 text-sm max-w-xs mx-auto">{error}</p>
        </div>
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center">
        <p className="text-paper/40 text-sm tracking-wide animate-pulse">Loading menu…</p>
      </div>
    )
  }

  const t = {
    name: (cat) => (lang === 'en' ? cat.name_en : cat.name_am),
    title: (item) => (lang === 'en' ? item.title_en : item.title_am),
    desc: (item) => (lang === 'en' ? item.description_en : item.description_am),
  }

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* Hero */}
      <header className="relative bg-espresso text-paper overflow-hidden">
        <div className="absolute inset-0 bg-grain pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-turmeric/10 blur-3xl" />
        <div className="relative max-w-xl mx-auto px-6 pt-12 pb-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-turmeric mb-3">Today's Menu</p>
          <h1 className="font-display italic text-4xl leading-tight">{menu.restaurant_name}</h1>
        </div>
      </header>

      {/* Language toggle + sticky category nav */}
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-espresso/10">
        <div className="max-w-xl mx-auto px-4 pt-3 flex items-center justify-between">
          <div className="flex gap-1 overflow-x-auto pb-3 flex-1 -mx-1 px-1">
            {menu.menu_categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition shrink-0
                  ${activeCat === cat.id ? 'bg-espresso text-paper' : 'bg-espresso/6 text-espresso/70 hover:bg-espresso/12'}`}
              >
                {t.name(cat)}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-espresso/6 p-0.5 ml-2 mb-3 shrink-0">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${lang === 'en' ? 'bg-turmeric text-espresso' : 'text-espresso/50'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('am')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${lang === 'am' ? 'bg-turmeric text-espresso' : 'text-espresso/50'}`}
            >
              አማ
            </button>
          </div>
        </div>
      </div>

      {/* Categories & items */}
      <main className="max-w-xl mx-auto px-5">
        {menu.menu_categories.length === 0 && (
          <p className="text-center text-ink/40 text-sm py-16">This menu doesn't have any items yet.</p>
        )}

        {menu.menu_categories.map((cat, idx) => (
          <section
            key={cat.id}
            ref={(el) => (sectionRefs.current[cat.id] = el)}
            className={idx === 0 ? 'pt-6' : 'pt-10'}
          >
            <h2 className="font-display text-2xl text-espresso mb-4">{t.name(cat)}</h2>

            <ul className="space-y-5">
              {cat.items.map((item) => (
                <li key={item.id} className={`flex gap-4 ${!item.is_available ? 'opacity-45' : ''}`}>
                  {item.image_s3_url && (
                    <img
                      src={item.image_s3_url}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover shrink-0 bg-espresso/5"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline">
                      <span className="font-display text-[1.05rem] text-ink">{t.title(item)}</span>
                      <span className="menu-leader" />
                      <span className="font-mono text-sm text-espresso shrink-0">{formatPrice(item.price)}</span>
                    </div>
                    {t.desc(item) && <p className="text-sm text-ink/50 mt-1 leading-snug">{t.desc(item)}</p>}
                    {!item.is_available && (
                      <span className="inline-block mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-berbere-600">
                        Sold out
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <footer className="max-w-xl mx-auto px-5 mt-14 text-center">
        <p className="text-xs text-ink/30">Prices in ETB · Ask your server for allergen details</p>
      </footer>
    </div>
  )
}
