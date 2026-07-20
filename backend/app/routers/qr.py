import io

import qrcode
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.config import settings
from app.dependencies import get_current_restaurant
from app.exceptions import restaurant_not_found

router = APIRouter(prefix="/api/v1/qr", tags=["qr"])


def _build_menu_url(unique_slug: str, table: str | None) -> str:
    base = settings.public_menu_base_url.rstrip("/")
    url = f"{base}/menu/{unique_slug}"
    if table:
        url += f"?table={table}"
    return url


def _render_png(url: str) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2B1B14", back_color="#FAF0DC")  # espresso on paper, matches brand palette
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


@router.get("/my-restaurant.png")
def get_my_restaurant_qr(
    table: str | None = Query(default=None, description="Optional table number/label to embed in the QR link"),
    restaurant: models.Restaurant = Depends(get_current_restaurant),
):
    """
    Section 1.5.2 'Automated Venue Identifier Generation' / Section 2.3.2
    'Table Identification Engine'. Authenticated managers call this to get
    a print-ready PNG QR code linking straight to their public menu
    (optionally tagged with a table number, purely for the manager's own
    reference — the public menu route ignores it and shows the same menu).
    """
    url = _build_menu_url(restaurant.unique_slug, table)
    png_bytes = _render_png(url)
    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")


@router.get("/{restaurant_slug}.png")
def get_qr_by_slug(restaurant_slug: str, table: str | None = Query(default=None), db: Session = Depends(get_db)):
    """
    Public/unauthenticated variant — useful for a super-admin onboarding
    flow or a print shop that only has the slug, not a login. Still 404s
    for unknown/inactive tenants so it can't be used to probe slugs.
    """
    restaurant = (
        db.query(models.Restaurant)
        .filter(models.Restaurant.unique_slug == restaurant_slug, models.Restaurant.is_active == True)  # noqa: E712
        .first()
    )
    if not restaurant:
        raise restaurant_not_found()
    url = _build_menu_url(restaurant.unique_slug, table)
    png_bytes = _render_png(url)
    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")
