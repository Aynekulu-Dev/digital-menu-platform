from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, cache
from app.dependencies import get_current_restaurant, require_compliant_tenant
from app.exceptions import item_not_found, quota_exceeded, validation_failed
from app.schemas import MenuItemCreateRequest, MenuItemUpdateRequest, MenuItemOut

router = APIRouter(prefix="/api/v1/menu-items", tags=["menu-items"])


def _get_owned_item(db: Session, restaurant: models.Restaurant, item_id: int) -> models.MenuItem:
    item = (
        db.query(models.MenuItem)
        .filter(models.MenuItem.id == item_id, models.MenuItem.restaurant_id == restaurant.id)
        .first()
    )
    if not item:
        raise item_not_found()
    return item


@router.post("/", status_code=201, response_model=MenuItemOut)
def create_menu_item(
    payload: MenuItemCreateRequest,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    """
    Section 4.3.1 write pipeline:
      1. compliance already checked by require_compliant_tenant
      2. verify the target category belongs to this tenant
      3. lock the active_quotas row (SELECT ... FOR UPDATE) so concurrent
         creates can't both slip past the limit check (Section 4.3.1, Step 6)
      4. insert the item + increment curr_item_count in one transaction
    """
    category = (
        db.query(models.Category)
        .filter(models.Category.id == payload.category_id, models.Category.restaurant_id == restaurant.id)
        .first()
    )
    if not category:
        raise validation_failed({"category_id": ["The selected category does not exist within your tenant scope."]})

    quota = (
        db.query(models.ActiveQuota)
        .filter(models.ActiveQuota.restaurant_id == restaurant.id)
        .with_for_update()
        .first()
    )
    if quota and not quota.is_within_item_limit():
        raise quota_exceeded()

    item = models.MenuItem(
        restaurant_id=restaurant.id,
        category_id=category.id,
        title_en=payload.title_en,
        title_am=payload.title_am,
        description_en=payload.description_en,
        description_am=payload.description_am,
        price=payload.price,
        image_s3_url=payload.image_s3_url,
        is_available=payload.is_available,
    )
    db.add(item)
    if quota:
        quota.curr_item_count += 1

    db.commit()
    db.refresh(item)
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return item


@router.get("/", response_model=list[MenuItemOut])
def list_menu_items(
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(get_current_restaurant),
):
    return db.query(models.MenuItem).filter(models.MenuItem.restaurant_id == restaurant.id).all()


@router.patch("/{item_id}/", response_model=MenuItemOut)
def update_menu_item(
    item_id: int,
    payload: MenuItemUpdateRequest,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    item = _get_owned_item(db, restaurant, item_id)

    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates:
        category = (
            db.query(models.Category)
            .filter(models.Category.id == updates["category_id"], models.Category.restaurant_id == restaurant.id)
            .first()
        )
        if not category:
            raise validation_failed(
                {"category_id": ["The selected category does not exist within your tenant scope."]})

    for field, value in updates.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return item


@router.delete("/{item_id}/", status_code=204)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    """Section 4.2.2, Delete Menu Item: atomic delete + quota decrement."""
    item = _get_owned_item(db, restaurant, item_id)

    quota = (
        db.query(models.ActiveQuota)
        .filter(models.ActiveQuota.restaurant_id == restaurant.id)
        .with_for_update()
        .first()
    )
    db.delete(item)
    if quota:
        quota.curr_item_count = max(0, quota.curr_item_count - 1)

    db.commit()
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return None


@router.patch("/{item_id}/toggle-availability/")
def toggle_availability(
    item_id: int,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    """Section 4.2.5: flips is_available, no request body required."""
    item = _get_owned_item(db, restaurant, item_id)
    item.is_available = not item.is_available
    db.commit()
    db.refresh(item)
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return {
        "status": "success",
        "data": {"id": item.id, "is_available": item.is_available, "updated_at": item.updated_at.isoformat()},
    }
