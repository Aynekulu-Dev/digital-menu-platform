# Digital Menu Platform — Frontend

React (Vite) + Tailwind CSS. Two experiences in one app:

- **`/menu/:slug`** — the public, zero-auth digital menu diners see when they scan a table's QR code.
- **`/login` + `/dashboard/*`** — the restaurant manager's admin panel (categories, menu items, quota, compliance status).

Talks to the FastAPI backend built earlier — no other backend changes needed
beyond the small `/api/v1/workspace/me/` endpoint added so the dashboard can
show your own quota usage.

## Design direction

Built around the actual subject — a printed restaurant menu — rather than a
generic SaaS dashboard look:

- **Palette**: espresso brown, warm paper/ivory, turmeric gold, berbere red,
  herb green — pulled from spice-market and coffee-ceremony tones rather than
  a generic light-cream-and-terracotta template.
- **Type**: Fraunces (an editorial serif with real character) for headings,
  Inter for UI text, JetBrains Mono for prices and data — numbers get a
  distinct, tabular voice from prose.
- **Signature element**: the dotted leader between an item's name and its
  price (`Special Kitfo ..... 450.00`) — literally how printed menus are
  typeset, carried through both the public menu and the admin item list.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env if your backend isn't running on http://127.0.0.1:8000

npm run dev
```

Open **http://127.0.0.1:5173**.

- Public menu (no login): `http://127.0.0.1:5173/menu/<unique_slug>`
- Manager login: `http://127.0.0.1:5173/login`

Make sure the backend is running first (`uvicorn app.main:app --reload` from
the `backend/` project) and that you've created at least one tenant via the
super-admin API — see the backend README for `create_super_admin` +
`POST /api/v1/super-admin/tenants/`.

## What's implemented

- Manager login (JWT stored in `localStorage`)
- Dashboard overview: item/category counts, quota usage bar, billing-status
  banner, copyable public menu link
- Categories: create / edit / delete (with cascade-delete warning)
- Menu items: create / edit / delete / one-click availability toggle,
  grouped by category
- Public menu: bilingual (English/Amharic) toggle, sticky category
  navigation, sold-out items visually dimmed and labeled
- Delinquent-billing lock: write actions disable across the dashboard when
  `monthly_receipt_status === "DELINQUENT"`, matching the backend's
  `SUBSCRIPTION_LOCKED` behavior

## Not implemented (flagged, not silently skipped)

- Super-admin UI (tenant onboarding/compliance/activation) — only the API
  exists today; provision tenants via `curl`/Swagger for now
- Image upload flow (presigned S3 URL → direct upload) — the item form
  accepts a ready-made `image_s3_url` instead
- QR code image generation for the share link (currently just a copyable URL)
