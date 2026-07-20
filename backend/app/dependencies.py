import uuid

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import decode_access_token
from app import models
from app.exceptions import subscription_locked, not_super_admin
from fastapi import HTTPException


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail={"status": "error", "code": "UNAUTHENTICATED",
                                                       "message": "Missing or malformed Authorization header."})
    return authorization.split(" ", 1)[1]


def get_current_restaurant(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Restaurant:
    """
    Resolves the authenticated tenant manager from the JWT and returns the
    Restaurant row. This is the single choke point (Section 4.4.1,
    TenantManager) through which every tenant-scoped request must pass:
    every downstream query filters explicitly on restaurant.id, so a
    handler can never accidentally touch another tenant's rows.
    """
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail={"status": "error", "code": "UNAUTHENTICATED",
                                                       "message": "Invalid or expired token."})

    sub = payload.get("sub", "")
    if not sub.startswith("restaurant:"):
        raise HTTPException(status_code=401, detail={"status": "error", "code": "UNAUTHENTICATED",
                                                       "message": "Token is not a valid manager session."})

    restaurant_id = sub.split(":", 1)[1]
    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == uuid.UUID(restaurant_id),
        models.Restaurant.is_active == True,  # noqa: E712  (mirrors TenantManager's is_active guard)
    ).first()

    if not restaurant:
        raise HTTPException(status_code=401, detail={"status": "error", "code": "UNAUTHENTICATED",
                                                       "message": "Tenant workspace not found or deactivated."})
    return restaurant


def require_compliant_tenant(restaurant: models.Restaurant = Depends(get_current_restaurant)) -> models.Restaurant:
    """Blocks writes when monthly_receipt_status == DELINQUENT (Section 4.3.1, Step 3)."""
    if restaurant.monthly_receipt_status == "DELINQUENT":
        raise subscription_locked()
    return restaurant


def get_current_super_admin(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.SuperAdmin:
    """Section 5.1.1: super-admin sessions are entirely decoupled from tenant auth."""
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail={"status": "error", "code": "UNAUTHENTICATED",
                                                       "message": "Invalid or expired token."})

    sub = payload.get("sub", "")
    if not sub.startswith("superadmin:"):
        raise not_super_admin()

    admin_id = int(sub.split(":", 1)[1])
    admin = db.query(models.SuperAdmin).filter(
        models.SuperAdmin.id == admin_id,
        models.SuperAdmin.is_active == True,  # noqa: E712
    ).first()
    if not admin:
        raise not_super_admin()
    return admin
