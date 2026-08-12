# Digital Menu Platform

Multi-tenant SaaS digital menu system for restaurants and cafes. Restaurant
managers maintain their menu (categories, items, prices, availability,
photos) from a dashboard. Diners scan a table QR code and see the live menu
instantly — no app install, no login required. Ordering itself stays
verbal, via waitstaff.

A **super admin** (the platform owner) onboards restaurants, sets their
subscription tier and billing status, and can lock a tenant out of write
access if their account is delinquent.

## How the system fits together

```
                         ┌────────────────────┐
   Restaurant manager ──▶│ frontend/ (React)  │──▶  backend/ (FastAPI) ──▶ PostgreSQL
                         │  /login, /dashboard │        (source of truth)
                         └────────────────────┘             │
                                                              │
                         ┌────────────────────┐              │
   Diner (QR scan)   ───▶│ public-menu/       │──────────────┘
                         │  vanilla JS/HTML    │   GET /api/v1/public/menu/{slug}/
                         └────────────────────┘

                         ┌────────────────────┐
   Super admin        ──▶│ frontend/          │──▶ backend/ super-admin routes
                         │  /{secret-path}    │
                         └────────────────────┘
```

| Piece | What it is | Tech | Deploys as |
|---|---|---|---|
| [`backend/`](./backend/README.md) | REST API: auth, tenant onboarding, menu CRUD, quota enforcement, public menu, QR codes | FastAPI + SQLAlchemy + PostgreSQL, optional Redis | Render Web Service |
| [`frontend/`](./frontend/README.md) | Manager dashboard + super admin panel | React (Vite) + Tailwind | Render Static Site |
| [`public-menu/`](./public-menu/README.md) | Diner-facing menu, deliberately framework-free so it loads fast on weak restaurant wifi when scanned | Vanilla JS/HTML/CSS | Render Static Site |

Each folder has its own README with details specific to it — this file is
the "how does the whole thing run" overview.

## Core concepts

- **Tenant / restaurant** — one row per onboarded restaurant. Has a
  `unique_slug` (used in the public menu URL and QR codes), a
  `subscription_tier` (`FREE`/`BASIC`/`STANDARD`, each with a max menu-item
  quota), and a `monthly_receipt_status` (`PENDING`/`PAID`/`DELINQUENT`).
  When `DELINQUENT`, all write endpoints for that tenant are locked —
  the public menu keeps working, but the manager can't edit anything until
  billing is resolved.
- **Categories & menu items** — standard CRUD, scoped to a tenant. Menu
  item creation is blocked once a tenant hits their tier's `max_menu_items`
  quota.
- **Manager onboarding flow** — the super admin creates a tenant with a
  name, slug, tier, and manager email but *no password*. This sends an
  invite email with a time-limited link; the manager follows it to set
  their own password for the first time (`POST /accept-invite`).
- **Super admin** — separate auth system from tenant managers
  (`SuperAdmin` vs `Restaurant` models, separate JWT scopes, separate
  login route). Lives at a deliberately non-obvious URL path — see
  "Hiding the super admin URL" below.

## Quick start (local dev)

You need Python 3.11+, Node 18+, and a local PostgreSQL instance running.

```bash
# 1. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL if your local Postgres differs
uvicorn app.main:app --reload
# → http://127.0.0.1:8000  (interactive API docs at /docs)

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env        # fill in Cloudinary creds if you want image upload to work
npm run dev
# → http://127.0.0.1:5173

# 3. Public menu (new terminal, optional — the React app's /menu/:slug also works)
cd public-menu
python3 -m http.server 8080
# → http://127.0.0.1:8080
```

Tables are created automatically on first backend startup
(`Base.metadata.create_all` — no migrations to run for local dev).

### Create your first super admin

```bash
cd backend
python -m scripts.create_super_admin \
  --name "Platform Owner" --email owner@yourplatform.com --password "ChangeMe123!"
```

Log in at `http://127.0.0.1:5173/super-admin/login` (or whatever
`VITE_SUPER_ADMIN_PATH` is set to — see below).

### Onboard your first restaurant

From the super admin dashboard, or directly via Swagger at
`http://127.0.0.1:8000/docs` → `POST /api/v1/super-admin/tenants/`:

```json
{
  "restaurant_name": "Blue Nile Cafe",
  "unique_slug": "blue-nile-cafe",
  "subscription_tier": "FREE",
  "manager_email": "manager@bluenilecafe.com"
}
```

This creates the tenant and sends them an invite email (or, if no email
provider is configured locally, just prints the invite link to your
`uvicorn` console — copy it from there).

- Manager dashboard: `http://127.0.0.1:5173/login`
- Public menu: `http://127.0.0.1:5173/menu/blue-nile-cafe` or
  `http://127.0.0.1:8080/menu/blue-nile-cafe`

## Environment variables

Full details and every variable are documented inline in each
`.env.example`:

- [`backend/.env.example`](./backend/.env.example) — database, JWT, CORS,
  email provider, Redis, S3
- [`frontend/.env.example`](./frontend/.env.example) — API URL, Cloudinary,
  super admin path

The short version of what's *required* to get a working local setup:

| File | Variable | Why it's required |
|---|---|---|
| `backend/.env` | `DATABASE_URL` | Nothing works without a database |
| `backend/.env` | `JWT_SECRET_KEY` | Signs all auth tokens |
| `frontend/.env` | `VITE_API_BASE_URL` | Where the dashboard sends requests |

Everything else (email provider, Redis cache, S3, Cloudinary, custom super
admin path) has a safe fallback and can be left blank for local dev.

## Sending real emails (invite / password reset)

By default, if no email provider is configured, invite and password-reset
emails are just printed to the backend console instead of sent — fine for
local dev.

For a real deployment, **use [Resend](https://resend.com)** (an HTTPS
email API), not raw SMTP — hosts like Render block outbound SMTP ports
(25/465/587) on free-tier services, so `smtplib` will silently time out
there no matter how correct your SMTP credentials are.

1. Sign up at resend.com (free, 3,000 emails/month, no card required).
2. Verify a sending domain under **Domains** (or use their shared test
   domain while developing).
3. Create an API key under **API Keys**.
4. Set `RESEND_API_KEY` in `backend/.env` (or your host's environment
   variables) and set `SMTP_FROM_EMAIL` to an address on your verified
   domain.

If you're running somewhere that *does* allow outbound SMTP (local dev, a
paid Render instance, a VPS), you can use `SMTP_HOST`/`SMTP_USERNAME`/
`SMTP_PASSWORD` instead — `RESEND_API_KEY` takes priority if both are set.

## Hiding the super admin URL

The super admin login isn't at a fixed, guessable path — it's controlled
by `VITE_SUPER_ADMIN_PATH` (frontend) so it can be set to something
unpredictable in production instead of the default `/super-admin`.

```bash
# generate a random path
python3 -c "import secrets; print('/mgmt-' + secrets.token_hex(4))"
```

Set that value as `VITE_SUPER_ADMIN_PATH` in your frontend environment and
redeploy (Vite env vars are baked in at *build* time, so this needs a
rebuild, not just a restart). This only obscures the URL from casual
discovery — it is not a substitute for the real auth check
(`SuperAdminProtectedRoute` + backend JWT verification), which still runs
regardless of the path.

## Deployment (Render)

All three pieces deploy to Render's free tier. See each folder's README +
`render.yaml` for exact settings; summary:

1. **Backend** — Render Web Service, root directory `backend`, external
   Postgres (e.g. [Neon](https://neon.tech)) via `DATABASE_URL`, Redis
   optional via `REDIS_URL`.
2. **Frontend** — Render Static Site, root directory `frontend`, build
   `npm install && npm run build`, publish `dist`, set `VITE_API_BASE_URL`
   / `VITE_CLOUDINARY_*` / `VITE_SUPER_ADMIN_PATH` at build time.
3. **Public menu** — Render Static Site, root directory `public-menu`, no
   build step, edit `app-config.js` to point at the backend URL.

After all three are up:

- Set `CORS_ORIGINS` and `FRONTEND_BASE_URL` on the backend to the
  deployed frontend URL, and `PUBLIC_MENU_BASE_URL` to the public-menu
  site's URL.
- Set `RESEND_API_KEY` on the backend so invite/reset emails actually
  send (see above — plain SMTP will not work on Render's free plan).
- All new source files must live under `frontend/src/` — Vite resolves
  relative imports (`./`, `../`) against the importing file's own folder,
  so a file placed outside `src/` (e.g. directly in `frontend/`) will
  build fine locally if it happens to still resolve, but is a common
  source of `Could not resolve "./something"` build failures on a fresh
  clone/deploy. Keep everything under `src/`.

## Local troubleshooting

- **`Could not resolve "./something" from "src/App.jsx"`** — a file is
  outside `frontend/src/`. Move it inside `src/` (see note above).
- **Emails never arrive, no error shown** — check the backend logs; if
  neither `RESEND_API_KEY` nor `SMTP_HOST` is set, emails are only logged
  to the console, not sent. If `SMTP_HOST` is set but you're on Render
  free tier, that's the SMTP-port-blocking issue above — switch to Resend.
- **"A restaurant with this slug/email already exists" for a restaurant
  you don't see in the list** — this happens if an earlier tenant-creation
  attempt succeeded in the database but failed to send its invite email
  (turning into what looked like a failed request). Check the super admin
  tenant list for a row with no password set; use its **resend invite**
  action once your email provider is configured, rather than creating a
  duplicate.

## Project structure

```
digital-menu-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, router registration
│   │   ├── config.py            # env-var-driven settings
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py, dependencies.py, tokens.py   # JWT auth (tenant + super admin)
│   │   ├── email_service.py     # Resend / SMTP / console-log email sending
│   │   ├── cache.py             # optional Redis cache-aside layer
│   │   └── routers/
│   │       ├── auth.py          # manager + super admin login, accept-invite, reset
│   │       ├── super_admin.py   # tenant onboarding, compliance, status
│   │       ├── categories.py, menu_items.py   # tenant menu CRUD
│   │       ├── public.py        # zero-auth public menu endpoint
│   │       ├── media.py         # S3 presigned upload URLs (optional)
│   │       ├── qr.py            # QR code PNG generation
│   │       └── workspace.py     # manager's own quota/status summary
│   ├── scripts/
│   │   ├── create_super_admin.py
│   │   └── reset_monthly_scans.py   # run as a monthly Render Cron Job
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # route table
│   │   ├── superAdminPath.js     # reads VITE_SUPER_ADMIN_PATH
│   │   ├── pages/                # Login, Dashboard, Categories, MenuItems,
│   │   │                         # SuperAdminLogin, SuperAdminDashboard, PublicMenu
│   │   ├── components/           # ProtectedRoute, SuperAdminProtectedRoute, Toast, ...
│   │   └── context/               # auth context providers
│   ├── package.json
│   └── .env.example
├── public-menu/
│   ├── index.html, app.js, styles.css
│   └── app-config.js             # the one file you edit per environment
├── .gitignore                    # covers .env in every subfolder
└── README.md      ← you are here
```

Note: there's no root-level `.env` / `.env.example` — `backend/` and
`frontend/` each have their own, since they're deployed as separate
services with separate variables.

## API surface (backend)

- `POST /api/v1/auth/login/` — tenant manager login
- `POST /api/v1/auth/super-admin/login/` — super admin login
- `POST /api/v1/auth/accept-invite/` — manager sets password from invite link
- `POST /api/v1/auth/request-password-reset/`, `POST /api/v1/auth/reset-password/`
- `GET/POST /api/v1/super-admin/tenants/` — list / onboard restaurants
- `POST /api/v1/super-admin/tenants/{id}/resend-invite/`
- `PATCH /api/v1/super-admin/tenants/{id}/compliance/` — set billing state
- `PATCH /api/v1/super-admin/tenants/{id}/status/` — activate/deactivate
- `GET/POST/PATCH/DELETE /api/v1/categories/` — category CRUD (tenant auth)
- `GET/POST/PATCH/DELETE /api/v1/menu-items/` — menu item CRUD (tenant auth, quota-enforced)
- `PATCH /api/v1/menu-items/{id}/toggle-availability/`
- `GET /api/v1/workspace/me/` — manager's own quota/status summary
- `POST /api/v1/media/presigned-url/` — S3 upload URL (optional, needs `AWS_*`)
- `GET /api/v1/qr/my-restaurant.png` / `GET /api/v1/qr/{slug}.png` — QR code PNG
- `GET /api/v1/public/menu/{restaurant_slug}/` — public, zero-auth diner menu

Full interactive docs (request/response schemas, try-it-out) at `/docs`
once the backend is running.

Every write endpoint enforces: tenant ownership (a manager can never touch
another restaurant's rows), the `DELINQUENT` compliance lock, and — for
menu item creation — the subscription tier's `max_menu_items` quota.

## What's not implemented yet

- Real DB migrations (currently `Base.metadata.create_all` — fine for a
  fresh deploy, not for evolving an existing production schema safely;
  swap in Alembic before that matters).
- Automated tests for cross-tenant isolation and quota-exceeded cases.
- A UI for deleting a tenant (only creation/compliance/status update exist
  today — deleting a stuck/duplicate tenant currently means a manual SQL
  delete via Render's Shell tab).