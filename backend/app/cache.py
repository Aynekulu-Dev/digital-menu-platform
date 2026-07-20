"""
Redis-backed cache + anti-spam layer for the public menu pipeline.

This is the "drop-in" cache layer the backend README said could be added
later (Section 3.3.3 / MenuCacheManager + QuotaEnforcer in the SDD). It is
entirely optional at the infra level: if REDIS_URL is not configured, every
function below degrades to a harmless no-op and the app behaves exactly as
it did before (straight-to-Postgres reads, plain scan counter).

Deploying on Render: create a Render "Key Value" instance (their managed
Redis-compatible store), copy its Internal Connection String into the
REDIS_URL env var on the web service.
"""
import json
from decimal import Decimal

import redis

from app.config import settings

_client: "redis.Redis | None" = None
_client_checked = False


def get_client() -> "redis.Redis | None":
    """Lazily connects once, then reuses the connection pool. Returns None
    (cache disabled) if REDIS_URL isn't set or the server is unreachable —
    callers must treat every cache operation as best-effort."""
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True

    if not settings.redis_url:
        _client = None
        return None

    try:
        client = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        _client = client
    except redis.RedisError:
        _client = None
    return _client


def _menu_key(restaurant_slug: str) -> str:
    return f"menu:{restaurant_slug}"


def _scan_dedupe_key(restaurant_id, client_ip: str) -> str:
    return f"scan:{restaurant_id}:{client_ip}"


class _DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)


def fetch_menu_cached(restaurant_slug: str) -> dict | None:
    """Section 3.3.3, MenuCacheManager.fetch_menu_cached(). Returns the
    compiled JSON payload if present, else None (caller falls back to Postgres)."""
    client = get_client()
    if not client:
        return None
    raw = client.get(_menu_key(restaurant_slug))
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


def store_menu_cache(restaurant_slug: str, payload: dict) -> None:
    client = get_client()
    if not client:
        return
    client.setex(_menu_key(restaurant_slug), settings.menu_cache_ttl_seconds, json.dumps(payload, cls=_DecimalEncoder))


def invalidate_tenant_cache(restaurant_slug: str) -> None:
    """Section 3.3.3, MenuCacheManager.invalidate_tenant_cache(). Called by
    the categories/menu-items routers right after a successful commit —
    this is the explicit equivalent of the Django post_save signal hook
    described in the SDD, since FastAPI has no signal dispatcher."""
    client = get_client()
    if not client:
        return
    client.delete(_menu_key(restaurant_slug))


def register_scan_if_new(restaurant_id, client_ip: str) -> bool:
    """
    Section 3.3.3, QuotaEnforcer.increment_scan() — anti-spam sliding window.
    Returns True if this (restaurant, ip) pair should count as a *new* scan
    (i.e. the caller should increment active_quotas.scan_count), False if
    this IP already scanned this restaurant within the dedupe window.

    Uses Redis SETNX + TTL as an atomic "have I seen this IP in the last 20
    minutes" check — a lightweight equivalent of the spec's sliding-window
    register. If Redis is unavailable, always returns True (falls back to
    the old plain-counter behavior; no dedupe, but never blocks a request).
    """
    client = get_client()
    if not client:
        return True
    key = _scan_dedupe_key(restaurant_id, client_ip)
    # SET key value NX EX <ttl> — atomically sets only if not already present
    was_new = client.set(key, "1", nx=True, ex=settings.scan_dedupe_window_seconds)
    return bool(was_new)
