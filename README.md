# Digital Menu Platform

Multi-tenant SaaS digital menu system for restaurants/cafes — venue managers
maintain their menu (categories, items, prices, availability, photos) from a
dashboard; diners scan a table QR code and see the live menu instantly, no
app or login required. Ordering itself stays verbal, via waitstaff (see
`final10.pdf` in project notes for the full original spec/scope).

## Structure

This is a monorepo with three independently-deployable pieces:

| Folder | What it is | Deploys as |
|---|---|---|
| [`backend/`](./backend/README.md) | FastAPI + SQLAlchemy API, PostgreSQL, optional Redis cache | Render Web Service |
| [`frontend/`](./frontend/README.md) | React (Vite) admin dashboard — manager login, menu CRUD, Super Admin tenant management | Render Static Site |
| [`public-menu/`](./public-menu/README.md) | Standalone vanilla JS/HTML diner-facing menu (decoupled from the React bundle for a lighter QR-scan load) | Render Static Site |

Each folder has its own README with setup and deploy details specific to it.

## Quick start (local dev)

```bash
# 1. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL etc.
uvicorn app.main:app --reload

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev

# 3. Public menu (new terminal, optional)
cd public-menu
python -m http.server 8080
```

See `backend/README.md` for creating your first Super Admin account
(`python -m scripts.create_super_admin ...`) and `frontend/README.md` /
`public-menu/README.md` for the two ways diners can view a menu.

## Deployment

All three pieces deploy to Render (free tier friendly). See each folder's
README + `render.yaml` for exact settings. Summary:

1. **Backend** — Render Web Service, root directory `backend`, external
   Postgres (e.g. Neon) via `DATABASE_URL`, Redis optional via `REDIS_URL`.
2. **Frontend** — Render Static Site, root directory `frontend`, build
   `npm install && npm run build`, publish `dist`, set `VITE_API_BASE_URL`
   at build time.
3. **Public menu** — Render Static Site, root directory `public-menu`, no
   build step, edit `app-config.js` to point at the backend URL.

After all three are up, set `CORS_ORIGINS` and `PUBLIC_MENU_BASE_URL` on
the backend service to the deployed frontend/public-menu URLs.
