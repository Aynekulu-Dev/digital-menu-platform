from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, cache
from app.exceptions import restaurant_not_found
from app.schemas import PublicMenuOut, PublicMenuCategoryOut, PublicMenuItemOut

router = APIRouter(prefix="/api/v1/public", tags=["public"])


def _client_ip(request: Request) -> str:
    # Render (and most PaaS) terminate TLS in front of the app and forward
    # the real client IP via X-Forwarded-For; fall back to the raw socket
    # peer for local dev.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/menu/{restaurant_slug}/", response_model=PublicMenuOut)
def get_public_menu(restaurant_slug: str, request: Request, db: Session = Depends(get_db)):
    """
    GET /api/v1/public/menu/{restaurant_slug}/ — Section 4.2.3.

    Cache-first resolution (Section 3.3.3, MenuCacheManager): tries Redis
    first via app.cache; on a miss (or if REDIS_URL isn't configured at
    all) it falls back straight to PostgreSQL exactly as before, then
    populates the cache for next time. This function is the single
    cache-read/cache-write choke point, same as the SDD specifies.
    """
    cached = cache.fetch_menu_cached(restaurant_slug)
    if cached is not None:
        restaurant_for_scan = (
            db.query(models.Restaurant)
            .filter(models.Restaurant.unique_slug == restaurant_slug, models.Restaurant.is_active == True)  # noqa: E712
            .first()
        )
        if restaurant_for_scan:
            _record_scan(db, restaurant_for_scan, request)
        return PublicMenuOut(**cached)

    restaurant = (
        db.query(models.Restaurant)
        .filter(models.Restaurant.unique_slug == restaurant_slug, models.Restaurant.is_active == True)  # noqa: E712
        .first()
    )
    if not restaurant:
        raise restaurant_not_found()

    _record_scan(db, restaurant, request)

    categories = (
        db.query(models.Category)
        .options(joinedload(models.Category.items))
        .filter(models.Category.restaurant_id == restaurant.id)
        .order_by(models.Category.sort_order.asc())
        .all()
    )

    menu_categories = [
        PublicMenuCategoryOut(
            id=cat.id,
            name_en=cat.name_en,
            name_am=cat.name_am,
            sort_order=cat.sort_order,
            items=[
                PublicMenuItemOut(
                    id=item.id,
                    title_en=item.title_en,
                    title_am=item.title_am,
                    description_en=item.description_en,
                    description_am=item.description_am,
                    price=item.price,
                    image_s3_url=item.image_s3_url,
                    is_available=item.is_available,
                )
                for item in cat.items
            ],
        )
        for cat in categories
    ]

    payload = PublicMenuOut(restaurant_name=restaurant.restaurant_name, menu_categories=menu_categories)
    cache.store_menu_cache(restaurant_slug, payload.model_dump(mode="json"))
    return payload


def _record_scan(db: Session, restaurant: models.Restaurant, request: Request) -> None:
    """
    Section 3.3.3, QuotaEnforcer.increment_scan(): anti-spam sliding window.
    Only increments scan_count if this client IP hasn't scanned this
    restaurant within the last `scan_dedupe_window_seconds` (default 20
    min). Degrades gracefully to a plain per-request counter if Redis is
    not configured (cache.register_scan_if_new always returns True then).
    """
    quota = restaurant.active_quota
    if not quota:
        return
    ip = _client_ip(request)
    if cache.register_scan_if_new(restaurant.id, ip):
        quota.scan_count += 1
        db.commit()
