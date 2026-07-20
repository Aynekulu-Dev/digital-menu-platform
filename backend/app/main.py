from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, super_admin, categories, menu_items, public, media, qr, workspace

# For an MVP without Alembic wired up yet, create tables on boot if they
# don't already exist. Safe to run repeatedly; switch to Alembic migrations
# (see alembic/ folder) once the schema needs versioned changes in prod.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Multi-Tenant Digital Menu Platform API",
    description="FastAPI + PostgreSQL backend for the digital menu SaaS platform.",
    version="1.0.0",
)

origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(super_admin.router)
app.include_router(categories.router)
app.include_router(menu_items.router)
app.include_router(public.router)
app.include_router(media.router)
app.include_router(qr.router)
app.include_router(workspace.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "digital-menu-platform-api"}


@app.get("/api/v1/health/", tags=["health"])
def api_health_check():
    return {"status": "ok"}
