import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Integer, BigInteger, Numeric, Text,
    ForeignKey, DateTime, func, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SubscriptionTier(str, enum.Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    STANDARD = "STANDARD"


class ReceiptStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DELINQUENT = "DELINQUENT"


# ---------------------------------------------------------------------------
# Table 0: super_admins  (Section 3.4, Data Dictionary Table 0)
# ---------------------------------------------------------------------------
class SuperAdmin(Base):
    __tablename__ = "super_admins"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    admin_email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ---------------------------------------------------------------------------
# Table 1: restaurants (tenant profile) (Section 3.4, Table 1)
# ---------------------------------------------------------------------------
class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_name = Column(String(255), nullable=False)
    unique_slug = Column(String(100), nullable=False, unique=True, index=True)
    subscription_tier = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    manager_email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    monthly_receipt_status = Column(String(20), nullable=False, default=ReceiptStatus.PENDING.value)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    created_by_id = Column(BigInteger, ForeignKey("super_admins.id", ondelete="SET NULL"), nullable=True)
    updated_by_id = Column(BigInteger, ForeignKey("super_admins.id", ondelete="SET NULL"), nullable=True)

    active_quota = relationship("ActiveQuota", back_populates="restaurant", uselist=False,
                                 cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="restaurant", cascade="all, delete-orphan")
    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")

    @property
    def is_compliant(self) -> bool:
        """Mirrors Restaurant.is_compliant() from Section 3.3.1."""
        return self.is_active and self.monthly_receipt_status != ReceiptStatus.DELINQUENT.value


# ---------------------------------------------------------------------------
# Table 2: active_quotas (Section 3.4, Table 2)
# ---------------------------------------------------------------------------
class ActiveQuota(Base):
    __tablename__ = "active_quotas"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"),
                            nullable=False, unique=True)
    max_menu_items = Column(Integer, nullable=False)
    curr_item_count = Column(Integer, nullable=False, default=0)
    scan_count = Column(BigInteger, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="active_quota")

    def is_within_item_limit(self) -> bool:
        return self.curr_item_count < self.max_menu_items


# ---------------------------------------------------------------------------
# Table 3: categories (Section 3.4, Table 3)
# ---------------------------------------------------------------------------
class Category(Base):
    __tablename__ = "categories"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    name_en = Column(String(150), nullable=False)
    name_am = Column(String(150), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="categories")
    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_categories_restaurant_sort", "restaurant_id", "sort_order"),
    )


# ---------------------------------------------------------------------------
# Table 4: menu_items (Section 3.4, Table 4)
# ---------------------------------------------------------------------------
class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)

    title_en = Column(String(255), nullable=False)
    title_am = Column(String(255), nullable=False)
    description_en = Column(Text, nullable=True)
    description_am = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    image_s3_url = Column(String(2048), nullable=True)
    is_available = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="menu_items")
    category = relationship("Category", back_populates="items")

    __table_args__ = (
        Index("ix_menu_items_restaurant_category", "restaurant_id", "category_id"),
    )
