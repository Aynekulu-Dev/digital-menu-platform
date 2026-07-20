from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import ManagerLoginRequest, SuperAdminLoginRequest, TokenResponse, RestaurantOut
from app.auth import verify_password, create_access_token
from app.exceptions import invalid_credentials

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login/", response_model=TokenResponse)
def manager_login(payload: ManagerLoginRequest, db: Session = Depends(get_db)):
    """POST /api/v1/auth/login/ — Section 4.2.1, Manager Authentication."""
    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.manager_email == payload.manager_email
    ).first()

    if not restaurant or not verify_password(payload.password, restaurant.password_hash):
        raise invalid_credentials()

    token = create_access_token(subject=f"restaurant:{restaurant.id}")
    return TokenResponse(
        token=token,
        restaurant_context=RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
    )


@router.post("/super-admin/login/", response_model=TokenResponse)
def super_admin_login(payload: SuperAdminLoginRequest, db: Session = Depends(get_db)):
    """
    Not explicitly listed as a route in Chapter 4, but required so a super
    admin can actually obtain the IsSuperAdmin token used by the
    /super-admin/... endpoints in Section 4.2.1 and 4.2.7.
    """
    admin = db.query(models.SuperAdmin).filter(
        models.SuperAdmin.admin_email == payload.admin_email
    ).first()

    if not admin or not verify_password(payload.password, admin.password_hash):
        raise invalid_credentials()

    token = create_access_token(subject=f"superadmin:{admin.id}")
    return TokenResponse(
        token=token,
        admin_context={"id": admin.id, "full_name": admin.full_name, "admin_email": admin.admin_email},
    )
