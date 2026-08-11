from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import (
    ManagerLoginRequest, SuperAdminLoginRequest, TokenResponse, RestaurantOut,
    AcceptInviteRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest, MessageResponse,
)
from app.auth import verify_password, hash_password, create_access_token
from app.config import settings
from app.dependencies import get_current_restaurant
from app.email_service import send_password_reset_email
from app.exceptions import invalid_credentials, account_not_activated, invalid_or_expired_token, validation_failed
from app.tokens import create_token, consume_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

MIN_PASSWORD_LENGTH = 8


def _validate_new_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise validation_failed({"new_password": [f"Must be at least {MIN_PASSWORD_LENGTH} characters."]})


@router.post("/login/", response_model=TokenResponse)
def manager_login(payload: ManagerLoginRequest, db: Session = Depends(get_db)):
    restaurant = db.query(models.Restaurant).filter(
        func.lower(models.Restaurant.manager_email) == payload.manager_email.strip().lower()
    ).first()

    if not restaurant:
        raise invalid_credentials()
    if restaurant.password_hash is None:
        raise account_not_activated()
    if not verify_password(payload.password, restaurant.password_hash):
        raise invalid_credentials()

    token = create_access_token(subject=f"restaurant:{restaurant.id}")
    return TokenResponse(
        token=token,
        restaurant_context=RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
    )


@router.post("/super-admin/login/", response_model=TokenResponse)
def super_admin_login(payload: SuperAdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(models.SuperAdmin).filter(
        func.lower(models.SuperAdmin.admin_email) == payload.admin_email.strip().lower()
    ).first()

    if not admin or not verify_password(payload.password, admin.password_hash):
        raise invalid_credentials()

    token = create_access_token(subject=f"superadmin:{admin.id}")
    return TokenResponse(
        token=token,
        admin_context={"id": admin.id, "full_name": admin.full_name, "admin_email": admin.admin_email},
    )


@router.post("/accept-invite/", response_model=TokenResponse)
def accept_invite(payload: AcceptInviteRequest, db: Session = Depends(get_db)):
    _validate_new_password(payload.new_password)

    restaurant = consume_token(db, payload.token, models.TokenPurpose.INVITE)
    if not restaurant:
        raise invalid_or_expired_token()

    restaurant.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(restaurant)

    token = create_access_token(subject=f"restaurant:{restaurant.id}")
    return TokenResponse(
        token=token,
        restaurant_context=RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
    )


@router.post("/forgot-password/", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    restaurant = db.query(models.Restaurant).filter(
        func.lower(models.Restaurant.manager_email) == payload.manager_email.strip().lower()
    ).first()

    if restaurant:
        raw_token = create_token(
            db, restaurant.id, models.TokenPurpose.RESET, settings.reset_token_expire_hours
        )
        reset_url = f"{settings.frontend_base_url}/reset-password?token={raw_token}"
        send_password_reset_email(restaurant.manager_email, restaurant.restaurant_name, reset_url)

    return {
        "status": "success",
        "message": "If that email is associated with a workspace, a password reset link has been sent.",
    }


@router.post("/reset-password/", response_model=TokenResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    _validate_new_password(payload.new_password)

    restaurant = consume_token(db, payload.token, models.TokenPurpose.RESET)
    if not restaurant:
        raise invalid_or_expired_token()

    restaurant.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(restaurant)

    token = create_access_token(subject=f"restaurant:{restaurant.id}")
    return TokenResponse(
        token=token,
        restaurant_context=RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
    )


@router.post("/change-password/", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(get_current_restaurant),
):
    _validate_new_password(payload.new_password)

    if restaurant.password_hash is None or not verify_password(
        payload.current_password, restaurant.password_hash
    ):
        raise invalid_credentials()

    restaurant.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"status": "success", "message": "Password changed."}