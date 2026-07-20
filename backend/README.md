# Multi-Tenant Digital Menu Platform — Backend

FastAPI + PostgreSQL backend implementing the core spec from Chapters 2–5
(auth, tenant onboarding, categories, menu items, quota enforcement, public
menu). No Docker, no Redis — designed to deploy straight onto Render's
native Python runtime + managed Postgres.

## What's here vs. the original DRF/Redis spec

| Spec said | This build does |
|---|---|
| Django Rest Framework | FastAPI + SQLAlchemy |
| Redis cache + rate-limit | **Implemented** via `app/cache.py`, backed by a Render "Key Value" instance (see `REDIS_URL`). Cache-aside on `GET /public/menu/{slug}/`, explicit invalidation from the categories/menu-items routers (no Django signals here, so it's a direct function call), and a Redis `SETNX`-based 20-minute IP dedupe window for scan counting. If `REDIS_URL` is unset, every function in `cache.py` no-ops and the app behaves exactly as the cache-less MVP did before — safe to run without it. |
| Docker Compose / EC2 | Render native Python web service + Render managed Postgres |
| Celery background jobs | **Implemented as a Render Cron Job** instead of an in-process worker: `scripts/reset_monthly_scans.py`, scheduled monthly via the `menu-platform-reset-scans` cron service in `render.yaml`. |
| QR code generation | **Implemented** — `GET /api/v1/qr/my-restaurant.png` (authenticated) and `GET /api/v1/qr/{slug}.png` return a print-ready PNG QR code linking to the public menu, optionally tagged with a table number. See `app/routers/qr.py`. |
| S3 presigned uploads | Implemented via boto3, optional — returns a clear 422 if AWS_* env vars aren't set |
| Public menu as a separate lightweight frontend | **Implemented** — see `../public-menu/`, a standalone vanilla JS + static HTML site, decoupled from the React admin dashboard bundle, deployed as its own Render Static Site. |

Everything else (multi-tenant isolation, quota limits, compliance locking,
audit fields, endpoint contracts and error shapes) follows Chapters 3–5
directly.

## Local setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: point DATABASE_URL at a local Postgres, set JWT_SECRET_KEY

uvicorn app.main:app --reload
```

Tables are auto-created on startup (`Base.metadata.create_all`). Then create
your first super admin:

```bash
python -m scripts.create_super_admin --name "Platform Owner" \
    --email owner@yourplatform.com --password "ChangeMe123!"
```

Open http://127.0.0.1:8000/docs for interactive Swagger docs of every route.

## New optional env vars

| Var | Purpose | Default |
|---|---|---|
| `REDIS_URL` | Enables the menu cache + scan dedupe. Leave unset to run cache-less. | unset |
| `MENU_CACHE_TTL_SECONDS` | How long a compiled public menu stays cached. | `60` |
| `SCAN_DEDUPE_WINDOW_SECONDS` | Anti-spam window for scan counting, per IP per restaurant. | `1200` (20 min) |
| `PUBLIC_MENU_BASE_URL` | Origin the QR codes point at — should be the `public-menu/` static site's URL, not this API's URL. | `https://menu.example.com` |

## Deploying to Render

**Option A — Blueprint (recommended):** push this repo to GitHub, then in
Render click *New > Blueprint* and point it at the repo. `render.yaml`
provisions a free Postgres instance and a web service wired together
automatically, and auto-generates `JWT_SECRET_KEY`.

**Option B — Manual:**
1. Create a Postgres instance on Render, copy its **Internal Database URL**.
2. Create a Web Service from this repo:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set env vars: `DATABASE_URL` (from step 1), `JWT_SECRET_KEY` (any long
   random string).
4. Deploy. Once live, open the Shell tab and run:
   ```bash
   python -m scripts.create_super_admin --name "Owner" --email you@example.com --password "..."
   ```

## API surface

- `POST /api/v1/auth/login/` — tenant manager login
- `POST /api/v1/auth/super-admin/login/` — super admin login
- `POST /api/v1/super-admin/tenants/` — onboard a new restaurant (super admin)
- `PATCH /api/v1/super-admin/tenants/{id}/compliance/` — set billing state
- `PATCH /api/v1/super-admin/tenants/{id}/status/` — activate/deactivate tenant
- `POST/GET/PATCH/DELETE /api/v1/categories/` — category CRUD (tenant auth)
- `POST/GET/PATCH/DELETE /api/v1/menu-items/` — menu item CRUD (tenant auth, quota-enforced)
- `PATCH /api/v1/menu-items/{id}/toggle-availability/`
- `POST /api/v1/media/presigned-url/` — S3 upload URL (optional, needs AWS_* env vars)
- `GET /api/v1/public/menu/{restaurant_slug}/` — public, zero-auth diner menu

Every write endpoint enforces: tenant ownership (you can never touch another
restaurant's rows), the `DELINQUENT` compliance lock, and — for menu item
creation — the subscription tier's `max_menu_items` quota.

## Next steps worth doing before real production traffic

- Swap `Base.metadata.create_all` for real Alembic migrations.
- Add a Redis layer back in front of `GET /public/menu/{slug}/` once scan
  volume justifies it.
- Add a Render Cron Job calling a small script that resets `scan_count` at
  the start of each billing cycle.
- Add automated tests for the cross-tenant isolation and quota-exceeded
  cases described in Section 6.1.
