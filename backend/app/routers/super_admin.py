import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app import models
from app.config import settings
from app.dependencies import get_current_super_admin
from app.email_service import send_invite_email, EmailSendError
from app.exceptions import validation_failed, APIError
from app.tokens import create_token
from app.schemas import (
    TenantCreateRequest, RestaurantOut, ActiveQuotaOut,
    TenantComplianceUpdateRequest, TenantStatusUpdateRequest, MessageResponse,
)

router = APIRouter(prefix="/api/v1/super-admin", tags=["super-admin"])


def _serialize_tenant(r: models.Restaurant) -> dict:
    return {
        "restaurant": RestaurantOut.model_validate(r).model_dump(mode="json"),
        "active_quota": ActiveQuotaOut.model_validate(r.active_quota).model_dump(mode="json")
        if r.active_quota else None,
    }


@router.get("/tenants/")
def list_tenants(
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    restaurants = db.query(models.Restaurant).order_by(models.Restaurant.created_at.desc()).all()
    return {"status": "success", "data": [_serialize_tenant(r) for r in restaurants]}


def _send_invite(db: Session, restaurant: models.Restaurant) -> None:
    raw_token = create_token(
        db, restaurant.id, models.TokenPurpose.INVITE, settings.invite_token_expire_hours
    )
    accept_url = f"{settings.frontend_base_url}/accept-invite?token={raw_token}"
    send_invite_email(restaurant.manager_email, restaurant.restaurant_name, accept_url)


@router.post("/tenants/", status_code=201)
def create_tenant(
    payload: TenantCreateRequest,
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    tier = payload.subscription_tier.upper()
    if tier not in settings.tier_limits:
        raise validation_failed({"subscription_tier": [f"Must be one of {list(settings.tier_limits)}."]})

    # Check slug/email individually first so we can report precisely which
    # one collides, instead of flagging both fields on any IntegrityError.
    conflicts: dict[str, list[str]] = {}
    if db.query(models.Restaurant).filter(
        models.Restaurant.unique_slug == payload.unique_slug
    ).first():
        conflicts["unique_slug"] = ["A restaurant with this slug already exists."]
    if db.query(models.Restaurant).filter(
        func.lower(models.Restaurant.manager_email) == payload.manager_email.strip().lower()
    ).first():
        conflicts["manager_email"] = ["This email identifier is already assigned to another tenant context."]
    if conflicts:
        raise validation_failed(conflicts)

    restaurant = models.Restaurant(
        id=uuid.uuid4(),
        restaurant_name=payload.restaurant_name,
        unique_slug=payload.unique_slug,
        subscription_tier=tier,
        manager_email=payload.manager_email,
        password_hash=None,
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

    # The restaurant + quota are already committed above. If the invite email
    # fails to send (e.g. email provider misconfigured), we must NOT raise
    # here -- doing so previously turned into a 500 for an already-created
    # tenant, which looked like "creation failed" even though the row existed,
    # and the next attempt with the same slug/email would then hit a real
    # conflict ("already exists"). Instead we report the email failure
    # separately so the admin can fix config and use resend-invite.
    invite_sent = True
    invite_error: str | None = None
    try:
        _send_invite(db, restaurant)
    except EmailSendError as e:
        invite_sent = False
        invite_error = str(e)

    message = (
        "Multi-tenant restaurant workspace and active quota system successfully "
        "provisioned. An invite email was sent to the manager to set their password."
        if invite_sent
        else "Restaurant workspace was created, but the invite email could not be sent. "
        "Fix the email configuration and use 'resend invite' for this tenant."
    )

    return {
        "status": "success",
        "message": message,
        "invite_sent": invite_sent,
        "invite_error": invite_error,
        "data": _serialize_tenant(restaurant),
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


@router.post("/tenants/{restaurant_id}/resend-invite/", response_model=MessageResponse)
def resend_invite(
    restaurant_id: str,
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
    restaurant = _get_tenant_or_404(db, restaurant_id)
    _send_invite(db, restaurant)
    return {"status": "success", "message": f"Invite email resent to {restaurant.manager_email}."}


@router.patch("/tenants/{restaurant_id}/compliance/")
def update_compliance(
    restaurant_id: str,
    payload: TenantComplianceUpdateRequest,
    db: Session = Depends(get_db),
    admin: models.SuperAdmin = Depends(get_current_super_admin),
):
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