import uuid
import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class ManagerLoginRequest(BaseModel):
    manager_email: EmailStr
    password: str


class SuperAdminLoginRequest(BaseModel):
    admin_email: EmailStr
    password: str


class TokenResponse(BaseModel):
    status: str = "success"
    token: str
    restaurant_context: Optional[dict] = None
    admin_context: Optional[dict] = None


# ---------------------------------------------------------------------------
# Restaurant / Tenant
# ---------------------------------------------------------------------------
class RestaurantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    restaurant_name: str
    unique_slug: str
    subscription_tier: str
    is_active: bool
    manager_email: EmailStr
    monthly_receipt_status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class TenantCreateRequest(BaseModel):
    restaurant_name: str
    unique_slug: str
    subscription_tier: str  # FREE | BASIC | STANDARD
    manager_email: EmailStr
    password: str


class ActiveQuotaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    max_menu_items: int
    curr_item_count: int
    scan_count: int
    updated_at: datetime.datetime


class TenantComplianceUpdateRequest(BaseModel):
    monthly_receipt_status: str  # PENDING | APPROVED | DELINQUENT


class TenantStatusUpdateRequest(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------
class CategoryCreateRequest(BaseModel):
    name_en: str
    name_am: str
    sort_order: int = 0


class CategoryUpdateRequest(BaseModel):
    name_en: Optional[str] = None
    name_am: Optional[str] = None
    sort_order: Optional[int] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: uuid.UUID
    name_en: str
    name_am: str
    sort_order: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------------------------------------------------------------------------
# Menu Item
# ---------------------------------------------------------------------------
class MenuItemCreateRequest(BaseModel):
    category_id: int
    title_en: str
    title_am: str
    description_en: Optional[str] = None
    description_am: Optional[str] = None
    price: Decimal
    image_s3_url: Optional[str] = None
    is_available: bool = True


class MenuItemUpdateRequest(BaseModel):
    category_id: Optional[int] = None
    title_en: Optional[str] = None
    title_am: Optional[str] = None
    description_en: Optional[str] = None
    description_am: Optional[str] = None
    price: Optional[Decimal] = None
    image_s3_url: Optional[str] = None
    is_available: Optional[bool] = None


class MenuItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: uuid.UUID
    category_id: int
    title_en: str
    title_am: str
    description_en: Optional[str] = None
    description_am: Optional[str] = None
    price: Decimal
    image_s3_url: Optional[str] = None
    is_available: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------------------------------------------------------------------------
# Public menu
# ---------------------------------------------------------------------------
class PublicMenuItemOut(BaseModel):
    id: int
    title_en: str
    title_am: str
    description_en: Optional[str] = None
    description_am: Optional[str] = None
    price: Decimal
    image_s3_url: Optional[str] = None
    is_available: bool


class PublicMenuCategoryOut(BaseModel):
    id: int
    name_en: str
    name_am: str
    sort_order: int
    items: List[PublicMenuItemOut]


class PublicMenuOut(BaseModel):
    status: str = "success"
    restaurant_name: str
    menu_categories: List[PublicMenuCategoryOut]


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------
class PresignedUrlRequest(BaseModel):
    file_name: str
    content_type: str


class PresignedUrlResponse(BaseModel):
    status: str = "success"
    upload_url: str
    expires_in_seconds: int
    public_file_url: str
