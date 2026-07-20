from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, cache
from app.dependencies import get_current_restaurant, require_compliant_tenant
from app.exceptions import category_not_found
from app.schemas import CategoryCreateRequest, CategoryUpdateRequest, CategoryOut

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.post("/", status_code=201, response_model=CategoryOut)
def create_category(
    payload: CategoryCreateRequest,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    category = models.Category(
        restaurant_id=restaurant.id,
        name_en=payload.name_en,
        name_am=payload.name_am,
        sort_order=payload.sort_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return category


@router.get("/", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(get_current_restaurant),
):
    return (
        db.query(models.Category)
        .filter(models.Category.restaurant_id == restaurant.id)
        .order_by(models.Category.sort_order.asc())
        .all()
    )


def _get_owned_category(db: Session, restaurant: models.Restaurant, category_id: int) -> models.Category:
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id, models.Category.restaurant_id == restaurant.id)
        .first()
    )
    if not category:
        raise category_not_found()
    return category


@router.patch("/{category_id}/", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdateRequest,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    category = _get_owned_category(db, restaurant, category_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return category


@router.delete("/{category_id}/", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    """
    Deletes the category. Per the ON DELETE CASCADE schema (Section 4.2.4),
    all menu_items under it cascade-delete too, so we decrement
    curr_item_count by exactly how many item rows are removed, inside the
    same transaction, before committing.
    """
    category = _get_owned_category(db, restaurant, category_id)

    cascaded_item_count = (
        db.query(models.MenuItem)
        .filter(models.MenuItem.category_id == category.id)
        .count()
    )

    quota = restaurant.active_quota
    if quota and cascaded_item_count:
        quota.curr_item_count = max(0, quota.curr_item_count - cascaded_item_count)

    db.delete(category)
    db.commit()
    cache.invalidate_tenant_cache(restaurant.unique_slug)
    return None
