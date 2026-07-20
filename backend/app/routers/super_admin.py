import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app import models
from app.auth import hash_password
from app.config import settings
from app.dependencies import get_current_super_admin
from app.exceptions import validation_failed, APIError
from app.schemas import (
    TenantCreateRequest, RestaurantOut, ActiveQuotaOut,
    TenantComplianceUpdateRequest, TenantStatusUpdateRequest,
)

router = APIRouter(prefix="/api/v1/super-admin", tags=["super-admin"])


@router.get("/tenants/")
def list_tenants(
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    """
    GET /api/v1/super-admin/tenants/ — was missing (the frontend api client
    already had listTenants() wired up, but nothing on the backend served
    it, so no Super Admin UI could be built). Returns every tenant with its
    quota, newest first, so the dashboard can list + manage them.
    """
    restaurants = db.query(models.Restaurant).order_by(models.Restaurant.created_at.desc()).all()
    return {
        "status": "success",
        "data": [
            {
                "restaurant": RestaurantOut.model_validate(r).model_dump(mode="json"),
                "active_quota": ActiveQuotaOut.model_validate(r.active_quota).model_dump(mode="json")
                if r.active_quota else None,
            }
            for r in restaurants
        ],
    }


@router.get("/tenants/")
def list_tenants(
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    """
    GET /api/v1/super-admin/tenants/ — was never in the original spec's
    endpoint list (Section 4.2.1 only documents create/compliance/status),
    but the super-admin UI needs somewhere to read the tenant roster from.
    """
    restaurants = db.query(models.Restaurant).order_by(models.Restaurant.created_at.desc()).all()
    data = [
        {
            "restaurant": RestaurantOut.model_validate(r).model_dump(mode="json"),
            "active_quota": ActiveQuotaOut.model_validate(r.active_quota).model_dump(mode="json")
            if r.active_quota else None,
        }
        for r in restaurants
    ]
    return {"status": "success", "data": data}


@router.post("/tenants/", status_code=201)
def create_tenant(
    payload: TenantCreateRequest,
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    """POST /api/v1/super-admin/tenants/ — Section 4.2.1, Tenant Manual Onboarding."""
    tier = payload.subscription_tier.upper()
    if tier not in settings.tier_limits:
        raise validation_failed({"subscription_tier": [f"Must be one of {list(settings.tier_limits)}."]})

    restaurant = models.Restaurant(
        id=uuid.uuid4(),
        restaurant_name=payload.restaurant_name,
        unique_slug=payload.unique_slug,
        subscription_tier=tier,
        manager_email=payload.manager_email,
        password_hash=hash_password(payload.password),
        monthly_receipt_status="PENDING",
        created_by_id=admin.id,
        updated_by_id=admin.id,
    )
    db.add(restaurant)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise validation_failed({
            "unique_slug": ["A restaurant with this slug already exists."],
            "manager_email": ["This email identifier is already assigned to another tenant context."],
        })

    quota = models.ActiveQuota(
        restaurant_id=restaurant.id,
        max_menu_items=settings.tier_limits[tier],
        curr_item_count=0,
        scan_count=0,
    )
    db.add(quota)
    db.commit()
    db.refresh(restaurant)
    db.refresh(quota)

    return {
        "status": "success",
        "message": "Multi-tenant restaurant workspace and active quota system successfully provisioned.",
        "data": {
            "restaurant": RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
            "active_quota": ActiveQuotaOut.model_validate(quota).model_dump(mode="json"),
        },
    }


def _get_tenant_or_404(db: Session, restaurant_id: str) -> models.Restaurant:
    try:
        rid = uuid.UUID(restaurant_id)
    except ValueError:
        raise APIError(404, "RESTAURANT_NOT_FOUND", "Invalid restaurant identifier.")
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.id == rid).first()
    if not restaurant:
        raise APIError(404, "RESTAURANT_NOT_FOUND", "No such tenant workspace.")
    return restaurant


@router.patch("/tenants/{restaurant_id}/compliance/")
def update_compliance(
    restaurant_id: str,
    payload: TenantComplianceUpdateRequest,
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    """PATCH /api/v1/super-admin/tenants/{id}/compliance/ — Section 4.2.1."""
    restaurant = _get_tenant_or_404(db, restaurant_id)
    status_value = payload.monthly_receipt_status.upper()
    if status_value not in ("PENDING", "APPROVED", "DELINQUENT"):
        raise validation_failed({"monthly_receipt_status": ["Must be PENDING, APPROVED, or DELINQUENT."]})

    restaurant.monthly_receipt_status = status_value
    restaurant.updated_by_id = admin.id
    db.commit()
    db.refresh(restaurant)

    return {
        "status": "success",
        "message": "Tenant compliance state updated. Workspace administrative write boundaries are now frozen."
        if status_value == "DELINQUENT" else "Tenant compliance state updated.",
        "data": RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
    }


@router.patch("/tenants/{restaurant_id}/status/")
def update_status(
    restaurant_id: str,
    payload: TenantStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    """PATCH /api/v1/super-admin/tenants/{id}/status/ — Section 4.2.7, Activation/Deactivation."""
    restaurant = _get_tenant_or_404(db, restaurant_id)
    restaurant.is_active = payload.is_active
    restaurant.updated_by_id = admin.id
    db.commit()
    db.refresh(restaurant)

    return {
        "status": "success",
        "message": "Tenant workspace has been deactivated. All administrative and public access is now blocked."
        if not payload.is_active else "Tenant workspace has been activated.",
        "data": {
            "id": str(restaurant.id),
            "is_active": restaurant.is_active,
            "updated_at": restaurant.updated_at.isoformat(),
            "updated_by_id": restaurant.updated_by_id,
        },
    }
